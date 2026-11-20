const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chunkText } = require('../utils/chunkText');
const { extractText, resolveMimeType, MIME } = require('../utils/extractText');
const { normalizeCitations } = require('../services/ragService');

const fixture = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));

describe('chunkText', () => {
  it('handles empty and non-string input', () => {
    assert.deepEqual(chunkText(''), []);
    assert.deepEqual(chunkText('   \n '), []);
    assert.deepEqual(chunkText(null), []);
    assert.deepEqual(chunkText(42), []);
  });

  it('returns short text as a single chunk', () => {
    assert.deepEqual(chunkText('Hello world.'), ['Hello world.']);
  });

  it('respects the size bound, covers all text and overlaps neighbours', () => {
    const sentences = Array.from({ length: 300 }, (_, i) => `Sentence ${i} talks about topic ${i % 7}.`);
    const text = sentences.join(' ');
    const chunks = chunkText(text, 1000, 200);
    assert.ok(chunks.length > 5);
    for (const c of chunks) assert.ok(c.length <= 1000, `chunk too long: ${c.length}`);
    for (const s of sentences) assert.ok(chunks.some((c) => c.includes(s)), `lost: ${s}`);
    for (let i = 1; i < chunks.length; i++) {
      const tail = chunks[i - 1].slice(-60);
      const firstWords = chunks[i].split(' ').slice(0, 3).join(' ');
      assert.ok(chunks[i - 1].includes(firstWords) || tail.length < 60, `no overlap between ${i - 1} and ${i}`);
    }
  });

  it('prefers sentence boundaries over cutting words', () => {
    const text = Array.from({ length: 80 }, (_, i) => `This is sentence number ${i}.`).join(' ');
    for (const c of chunkText(text, 300, 50)) assert.match(c, /\.$/, `chunk does not end at a sentence: "${c.slice(-30)}"`);
  });

  it('terminates on text without any spaces', () => {
    const chunks = chunkText('x'.repeat(5000), 1000, 200);
    assert.ok(chunks.length >= 5 && chunks.length < 10);
    assert.ok(chunks.every((c) => c.length <= 1000));
  });

  it('normalizes Windows line endings and runs of blank lines', () => {
    const [c] = chunkText('a\r\nb\r\n\r\n\r\n\r\nc');
    assert.equal(c, 'a\nb\n\nc');
  });
});

describe('extractText', () => {
  it('resolves MIME types from the browser type or the extension', () => {
    assert.equal(resolveMimeType('application/pdf', 'x.bin'), MIME.pdf);
    assert.equal(resolveMimeType('application/octet-stream', 'Report.DOCX'), MIME.docx);
    assert.equal(resolveMimeType('', 'notes.md'), MIME.md);
    assert.equal(resolveMimeType('application/x-msdownload', 'virus.exe'), null);
    assert.equal(resolveMimeType('', 'noextension'), null);
  });

  it('reads every page of a multi-page PDF without page markers', async () => {
    const text = await extractText(fixture('multipage.pdf'), MIME.pdf);
    for (const p of [1, 2, 3]) assert.ok(text.includes(`MARKER-PAGE-${p}`), `missing page ${p}`);
    assert.doesNotMatch(text, /-- \d+ of \d+ --/);
  });

  it('parses PDFs reliably while the embedding model is loading (regression)', async () => {
    const { initializeEmbedder } = require('../utils/embeddings');
    const loading = initializeEmbedder();
    const results = await Promise.all([1, 2, 3, 4].map(() => extractText(fixture('invoice.pdf'), MIME.pdf)));
    await loading;
    for (const t of results) assert.match(t, /4,860 US dollars/);
  });

  it('reads DOCX, TXT and Markdown', async () => {
    assert.match(await extractText(fixture('handbook.docx'), MIME.docx), /16 weeks of fully paid parental leave/);
    assert.match(await extractText(fixture('handbook.txt'), MIME.txt), /learning budget/);
    assert.equal(await extractText(Buffer.from('# Title\n\nBody'), MIME.md), '# Title\n\nBody');
  });

  it('rejects empty, corrupt and unsupported files', async () => {
    await assert.rejects(extractText(Buffer.from('  \n\u0000 '), MIME.txt), /No readable text/);
    await assert.rejects(extractText(Buffer.from('not a pdf'), MIME.pdf));
    await assert.rejects(extractText(Buffer.from('not a docx'), MIME.docx));
    await assert.rejects(extractText(Buffer.from('x'), 'image/png'), /Unsupported/);
  });
});

describe('normalizeCitations', () => {
  it('converts model-specific citation styles to [n]', () => {
    assert.equal(normalizeCitations('Due 4,860【1】 and fee【2†L3-L5】.'), 'Due 4,860[1] and fee[2].');
    assert.equal(normalizeCitations('A [1][2] b [3†L1].'), 'A [1][2] b [3].');
  });
  it('drops a trailing Sources section but keeps Markdown links', () => {
    assert.equal(normalizeCitations('Answer [1].\n\n**Source:** the invoice【1】.'), 'Answer [1].');
    assert.equal(normalizeCitations('See [docs](https://x.y) [2].'), 'See [docs](https://x.y) [2].');
  });
});
