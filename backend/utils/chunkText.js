/**
 * Splits text into overlapping chunks that respect natural boundaries.
 *
 * It prefers to cut at paragraph breaks, then sentence ends, then whitespace,
 * so chunks don't end mid-word — which makes both retrieval and the citations
 * shown to the user read much better.
 *
 * @param {string} text
 * @param {number} chunkSize   target max characters per chunk
 * @param {number} overlapSize characters carried over between chunks
 * @returns {string[]}
 */
const chunkText = (text, chunkSize = 1000, overlapSize = 200) => {
  if (!text || typeof text !== 'string') return [];

  const clean = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (clean.length <= chunkSize) return clean ? [clean] : [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);

    if (end < clean.length) {
      const window = clean.slice(start, end);
      const minCut = Math.floor(chunkSize * 0.5);
      const candidates = [
        window.lastIndexOf('\n\n'),
        Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '), window.lastIndexOf('.\n')),
        window.lastIndexOf('\n'),
        window.lastIndexOf(' '),
      ];
      const cut = candidates.find((idx) => idx >= minCut);
      if (cut !== undefined) end = start + cut + 1;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= clean.length) break;

    // Step back by the overlap, but snap forward to a word boundary.
    let next = Math.max(end - overlapSize, start + 1);
    const space = clean.indexOf(' ', next);
    if (space !== -1 && space < end) next = space + 1;
    start = next;
  }

  return chunks;
};

module.exports = { chunkText };
