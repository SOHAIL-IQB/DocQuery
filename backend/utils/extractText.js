const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
};

/**
 * Browsers are inconsistent about MIME types (e.g. .docx can arrive as
 * application/octet-stream, .md as an empty string). Resolve the real type
 * from the MIME first and the file extension second.
 */
const resolveMimeType = (mimetype = '', fileName = '') => {
  if (Object.values(MIME).includes(mimetype)) return mimetype;
  const ext = fileName.split('.').pop().toLowerCase();
  return MIME[ext] || null;
};

/**
 * Extracts raw text from a file buffer.
 * @param {Buffer} buffer
 * @param {string} mimetype a type returned by resolveMimeType
 * @returns {Promise<string>}
 */
const extractText = async (buffer, mimetype) => {
  let text;
  switch (mimetype) {
    case MIME.pdf:
      text = (await pdfParse(buffer)).text;
      break;
    case MIME.docx:
      text = (await mammoth.extractRawText({ buffer })).value;
      break;
    case MIME.txt:
    case MIME.md:
      text = buffer.toString('utf-8');
      break;
    default:
      throw new Error('Unsupported file type.');
  }

  text = (text || '').replace(/\u0000/g, '').trim();
  if (!text) {
    throw new Error('No readable text found. Scanned/image-only PDFs are not supported yet.');
  }
  return text;
};

module.exports = { extractText, resolveMimeType, MIME };
