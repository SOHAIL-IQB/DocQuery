const OpenAI = require('openai');

// Groq exposes an OpenAI-compatible API. When GROQ_API_KEY is missing the
// client is null and the RAG service falls back to an extractive answer,
// so the app still works end-to-end in local development.
const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

module.exports = { groq, GROQ_MODEL };
