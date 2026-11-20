const OpenAI = require('openai');

// Groq exposes an OpenAI-compatible API. When GROQ_API_KEY is missing the
// client is null and the RAG service falls back to an extractive answer,
// so the app still works end-to-end in local development.
const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      maxRetries: 2,
      timeout: 60_000,
    })
  : null;

// Groq retires models over time (llama-3.1-8b-instant was removed), so try the
// configured model first and fall back to known-good ones if it disappears.
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const GROQ_MODEL = process.env.GROQ_MODEL || FALLBACK_MODELS[0];
const candidates = [...new Set([GROQ_MODEL, ...FALLBACK_MODELS])];
let activeIndex = 0;

const isMissingModel = (err) =>
  err?.status === 404 ||
  err?.code === 'model_not_found' ||
  err?.code === 'model_decommissioned' ||
  /model .*(does not exist|decommissioned|not found)/i.test(err?.message || '');

const withModelDefaults = (model, params) => ({
  ...params,
  model,
  // gpt-oss models are reasoning models; low effort keeps answers fast for RAG.
  ...(model.startsWith('openai/gpt-oss') && !params.reasoning_effort ? { reasoning_effort: 'low' } : {}),
});

/**
 * chat.completions.create with automatic model fallback.
 * @param {object} params  OpenAI chat params without `model`
 * @param {object} [options] request options (e.g. { signal })
 */
async function createChatCompletion(params, options) {
  if (!groq) throw new Error('GROQ_API_KEY is not configured');
  for (let i = activeIndex; i < candidates.length; i++) {
    try {
      const result = await groq.chat.completions.create(withModelDefaults(candidates[i], params), options);
      if (i !== activeIndex) {
        console.warn(`[groq] model "${candidates[activeIndex]}" unavailable — switched to "${candidates[i]}"`);
        activeIndex = i;
      }
      return result;
    } catch (err) {
      if (!isMissingModel(err) || i === candidates.length - 1) throw err;
    }
  }
  throw new Error('No Groq model available');
}

const currentModel = () => candidates[activeIndex];

module.exports = { groq, GROQ_MODEL, createChatCompletion, currentModel };
