const mongoose = require('mongoose');
const DocumentChunk = require('../models/DocumentChunk');
const Document = require('../models/Document');
const { generateEmbedding } = require('../utils/embeddings');
const { groq, createChatCompletion } = require('../utils/groq');

const TOP_K = 6;               // chunks sent to the LLM
const PER_DOC_LIMIT = 4;       // diversity cap so one document can't hog the context
const MIN_SCORE = 0.15;        // cosine floor for the local search
const MAX_CONTEXT_CHARS = 14000;
const HISTORY_TURNS = 6;       // previous messages included for follow-up questions

// 'auto' tries Atlas $vectorSearch first, then falls back to in-app cosine.
// 'atlas' / 'local' force one strategy.
const VECTOR_SEARCH_MODE = (process.env.VECTOR_SEARCH || 'auto').toLowerCase();
let atlasAvailable = VECTOR_SEARCH_MODE !== 'local';

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/** Keeps the top N chunks per document, then the global top K. */
const diversify = (chunks, k = TOP_K) => {
  const perDoc = new Map();
  const out = [];
  for (const c of chunks.sort((a, b) => b.score - a.score)) {
    const key = String(c.documentId);
    const n = perDoc.get(key) || 0;
    if (n >= PER_DOC_LIMIT) continue;
    perDoc.set(key, n + 1);
    out.push(c);
    if (out.length >= k) break;
  }
  return out;
};

const atlasSearch = async (userId, queryEmbedding, readyIds) => {
  const results = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit: 60,
        filter: { userId: toObjectId(userId) },
      },
    },
    {
      $project: {
        _id: 0,
        chunkText: '$text',
        documentId: 1,
        chunkIndex: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
    { $match: { documentId: { $in: readyIds } } },
  ]);
  return results;
};

const localSearch = async (userId, queryEmbedding, readyIds) => {
  const chunks = await DocumentChunk.find(
    { userId: toObjectId(userId), documentId: { $in: readyIds } },
    { text: 1, embedding: 1, documentId: 1, chunkIndex: 1 }
  ).lean();

  return chunks
    .map((c) => {
      // Embeddings are L2-normalized, so the dot product is the cosine similarity.
      let score = 0;
      const e = c.embedding;
      for (let i = 0; i < e.length; i++) score += e[i] * queryEmbedding[i];
      return { chunkText: c.text, documentId: c.documentId, chunkIndex: c.chunkIndex, score };
    })
    .filter((c) => c.score >= MIN_SCORE);
};

/**
 * Finds the most relevant chunks across the user's Ready documents.
 * @returns {Promise<Array<{chunkText, documentId, fileName, chunkIndex, score}>>}
 */
const retrieveRelevantChunks = async (userId, queryEmbedding, documentIds = []) => {
  const filter = { userId: toObjectId(userId), status: 'Ready' };
  const requested = (Array.isArray(documentIds) ? documentIds : [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (requested.length) filter._id = { $in: requested.map(toObjectId) };

  const readyDocs = await Document.find(filter).select('_id fileName').lean();
  if (!readyDocs.length) return [];

  const readyIds = readyDocs.map((d) => d._id);
  const names = new Map(readyDocs.map((d) => [String(d._id), d.fileName]));

  let candidates = [];
  if (atlasAvailable) {
    try {
      candidates = await atlasSearch(userId, queryEmbedding, readyIds);
    } catch (err) {
      if (VECTOR_SEARCH_MODE === 'atlas') throw err;
      console.warn(`[rag] Atlas $vectorSearch unavailable (${err.codeName || err.message}). Using local cosine search.`);
      atlasAvailable = false;
    }
  }
  // Atlas silently returns nothing when the index is missing — fall back in that case too.
  if (!candidates.length && VECTOR_SEARCH_MODE !== 'atlas') {
    candidates = await localSearch(userId, queryEmbedding, readyIds);
  }

  return diversify(candidates).map((c) => ({
    ...c,
    documentId: String(c.documentId),
    fileName: names.get(String(c.documentId)) || 'Document',
  }));
};

const SYSTEM_PROMPT = `You are DocQuery, a precise research assistant that answers questions using ONLY the numbered document excerpts provided.

Rules:
- Ground every claim in the excerpts. Cite them inline with plain ASCII square brackets like [1] or [2][3], placed right after the claim. Never use other citation styles such as 【1】 or [1†L3].
- If the excerpts don't contain the answer, say so plainly and suggest what the user could ask or upload instead. Never invent facts.
- Be concise: start directly with the answer (no "Answer:" heading), then supporting detail. Use Markdown (short paragraphs, bullet lists, tables, **bold** for key terms) when it helps readability.
- Do not add a "Sources" or "References" section — the app shows the sources itself.
- Use the conversation history only to understand follow-up questions; the excerpts remain the source of truth.`;

// Some models emit 【1】 or [1†L3-L5] despite instructions. Bracket characters are
// mapped per streamed delta (they may arrive split); the full answer is cleaned at the end.
const normalizeDelta = (text) => text.replace(/【/g, '[').replace(/】/g, ']');
const normalizeCitations = (text) =>
  normalizeDelta(text)
    .replace(/\[(\d{1,2})†[^\]]*\]/g, '[$1]')
    .replace(/\n+\**(?:Sources?|References?)\**:?\**[^\n]*(?:\n[-*] .*)*\s*$/i, '')
    .trim();

const buildContext = (sources) => {
  let ctx = '';
  sources.forEach((s, i) => {
    const block = `[${i + 1}] (from "${s.fileName}")\n${s.chunkText}\n\n`;
    if (ctx.length + block.length <= MAX_CONTEXT_CHARS) ctx += block;
  });
  return ctx.trim();
};

const buildMessages = (question, sources, history = []) => [
  { role: 'system', content: SYSTEM_PROMPT },
  ...history.slice(-HISTORY_TURNS).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 2000),
  })),
  {
    role: 'user',
    content: `DOCUMENT EXCERPTS:\n${buildContext(sources)}\n\nQUESTION: ${question}`,
  },
];

const NO_CONTEXT_ANSWER =
  "I couldn't find anything relevant to that in the selected documents. Try rephrasing the question, selecting different documents, or uploading a file that covers this topic.";

/** Used when no LLM key is configured: return the best passages verbatim. */
const extractiveAnswer = (sources) => {
  const quotes = sources
    .slice(0, 3)
    .map((s, i) => `> ${s.chunkText.slice(0, 420).replace(/\n+/g, ' ')}${s.chunkText.length > 420 ? '…' : ''} [${i + 1}]`)
    .join('\n\n');
  return `**AI generation is not configured** (set \`GROQ_API_KEY\` in \`backend/.env\`), so here are the most relevant passages from your documents:\n\n${quotes}`;
};

/** Shared retrieval step for both streaming and non-streaming answers. */
const retrieve = async (userId, question, documentIds) => {
  const queryEmbedding = await generateEmbedding(question);
  return retrieveRelevantChunks(userId, queryEmbedding, documentIds);
};

/**
 * Non-streaming answer (kept for API compatibility).
 * @returns {Promise<{answer: string, sources: Array}>}
 */
const generateAnswer = async (userId, question, documentIds = [], history = []) => {
  const sources = await retrieve(userId, question, documentIds);
  if (!sources.length) return { answer: NO_CONTEXT_ANSWER, sources: [] };
  if (!groq) return { answer: extractiveAnswer(sources), sources };

  const completion = await createChatCompletion({
    messages: buildMessages(question, sources, history),
    temperature: 0.2,
  });
  const answer = normalizeCitations(completion.choices[0]?.message?.content || '') || NO_CONTEXT_ANSWER;
  return { answer, sources };
};

/**
 * Streaming answer. Calls onSources once, then onToken for each text delta.
 * @returns {Promise<{answer: string, sources: Array}>}
 */
const streamAnswer = async ({ userId, question, documentIds = [], history = [], signal, onSources, onToken }) => {
  const sources = await retrieve(userId, question, documentIds);
  onSources?.(sources);

  const emitWhole = async (text) => {
    // Stream canned text in small pieces so the UI behaves the same either way.
    const parts = text.match(/\S+\s*/g) || [text];
    for (const p of parts) {
      if (signal?.aborted) break;
      onToken?.(p);
      await new Promise((r) => setTimeout(r, 12));
    }
    return text;
  };

  if (!sources.length) return { answer: await emitWhole(NO_CONTEXT_ANSWER), sources: [] };
  if (!groq) return { answer: await emitWhole(extractiveAnswer(sources)), sources };

  const stream = await createChatCompletion(
    {
      messages: buildMessages(question, sources, history),
      temperature: 0.2,
      stream: true,
    },
    { signal }
  );

  let answer = '';
  try {
    for await (const part of stream) {
      const raw = part.choices[0]?.delta?.content;
      if (raw) {
        const delta = normalizeDelta(raw);
        answer += delta;
        onToken?.(delta);
      }
    }
  } catch (err) {
    if (!signal?.aborted) throw err;
  }
  return { answer: normalizeCitations(answer), sources };
};

/**
 * Generates a short summary and starter questions for a freshly processed document.
 * Returns null when no LLM is configured or the call fails — this is a nice-to-have.
 */
const generateDocumentInsights = async (fileName, text) => {
  if (!groq) return null;
  try {
    const completion = await createChatCompletion({
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You summarize documents. Reply with JSON only: {"summary": string (2-3 sentences, plain text), "questions": string[] (exactly 3 short, specific questions a reader could ask about this document)}.',
        },
        { role: 'user', content: `Document: "${fileName}"\n\n${text.slice(0, 8000)}` },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 800) : undefined,
      suggestedQuestions: Array.isArray(parsed.questions)
        ? parsed.questions.filter((q) => typeof q === 'string').slice(0, 3).map((q) => q.trim().slice(0, 160))
        : undefined,
    };
  } catch (err) {
    console.warn(`[rag] insights generation skipped: ${err.message}`);
    return null;
  }
};

module.exports = {
  normalizeCitations,
  retrieveRelevantChunks,
  generateAnswer,
  streamAnswer,
  generateDocumentInsights,
};
