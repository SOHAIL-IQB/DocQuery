const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let embedderPromise = null;

/**
 * Loads the local @xenova/transformers embedding model once and caches it.
 * Safe to call many times — concurrent callers share the same load.
 */
function initializeEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      const embedder = await pipeline('feature-extraction', MODEL_ID);
      console.log(`[embeddings] ${MODEL_ID} loaded`);
      return embedder;
    })().catch((err) => {
      embedderPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return embedderPromise;
}

/**
 * Embeds a single string into a normalized 384-dim vector.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const embedder = await initializeEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Embeds several strings in one forward pass (much faster than one by one).
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function generateEmbeddings(texts) {
  if (!texts.length) return [];
  const embedder = await initializeEmbedder();
  const output = await embedder(texts, { pooling: 'mean', normalize: true });
  const [rows, dims] = output.dims;
  const vectors = [];
  for (let i = 0; i < rows; i++) {
    vectors.push(Array.from(output.data.slice(i * dims, (i + 1) * dims)));
  }
  return vectors;
}

module.exports = {
  initializeEmbedder,
  generateEmbedding,
  generateEmbeddings,
};
