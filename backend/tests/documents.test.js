const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, register, upload, fixture, waitForDocument, mongoose } = require('./helpers');

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('documents', () => {
  let alice;
  let bob;

  before(async () => {
    await start();
    alice = await register();
    bob = await register();
  });
  after(stop);

  it('processes a TXT file to Ready with real progress and passages', async () => {
    const up = await upload(alice.token, 'handbook.txt', fixture('handbook.txt'));
    assert.equal(up.status, 202);
    assert.equal(up.body.data.status, 'Processing');
    const doc = await waitForDocument(alice.token, up.body.data._id);
    assert.equal(doc.status, 'Ready', doc.error);
    assert.equal(doc.progress, 100);
    assert.ok(doc.chunkCount >= 1);
    assert.ok(doc.characterCount > 100);
  });

  it('extracts text from real DOCX and PDF files', async () => {
    const d = await upload(alice.token, 'handbook.docx', fixture('handbook.docx'), DOCX);
    const p = await upload(alice.token, 'invoice.pdf', fixture('invoice.pdf'), 'application/pdf');
    assert.equal(d.status, 202);
    assert.equal(p.status, 202);
    const [docx, pdf] = await Promise.all([waitForDocument(alice.token, d.body.data._id), waitForDocument(alice.token, p.body.data._id)]);
    assert.equal(docx.status, 'Ready', docx.error);
    assert.equal(pdf.status, 'Ready', pdf.error);

    const Chunk = mongoose.model('DocumentChunk');
    const pdfText = (await Chunk.find({ documentId: pdf._id })).map((c) => c.text).join(' ');
    assert.match(pdfText, /4,860/);
    const docxText = (await Chunk.find({ documentId: docx._id })).map((c) => c.text).join(' ');
    assert.match(docxText, /25 days of paid vacation/);
  });

  it('accepts Markdown and files whose browser MIME type is generic', async () => {
    const md = await upload(alice.token, 'notes.md', '# Notes\n\nThe launch date is **12 May**.', '');
    assert.equal(md.status, 202, JSON.stringify(md.body));
    const docx = await upload(alice.token, 'generic.docx', fixture('handbook.docx'), 'application/octet-stream');
    assert.equal(docx.status, 202, JSON.stringify(docx.body));
    assert.equal((await waitForDocument(alice.token, md.body.data._id)).status, 'Ready');
    assert.equal((await waitForDocument(alice.token, docx.body.data._id)).status, 'Ready');
  });

  it('keeps non-ASCII file names intact', async () => {
    const up = await upload(alice.token, 'Résumé – 東京.txt', 'Short note about Tokyo.');
    assert.equal(up.status, 202);
    assert.equal(up.body.data.fileName, 'Résumé – 東京.txt');
  });

  it('rejects unsupported types, missing files and oversized files with clear errors', async () => {
    const exe = await upload(alice.token, 'virus.exe', 'MZ...', 'application/octet-stream');
    assert.equal(exe.status, 415);
    assert.match(exe.body.error, /Unsupported/);

    const empty = await api('POST', '/documents/upload', { token: alice.token, raw: new FormData() });
    assert.equal(empty.status, 400);

    const big = await upload(alice.token, 'big.txt', Buffer.alloc(10 * 1024 * 1024 + 10, 'a'));
    assert.equal(big.status, 413);
    assert.match(big.body.error, /10 MB/);
  });

  it('marks empty or unreadable files as Failed with a reason', async () => {
    const blank = await upload(alice.token, 'blank.txt', '   \n  ');
    const doc = await waitForDocument(alice.token, blank.body.data._id);
    assert.equal(doc.status, 'Failed');
    assert.match(doc.error, /No readable text/);

    const corrupt = await upload(alice.token, 'broken.pdf', 'this is not a pdf', 'application/pdf');
    const bad = await waitForDocument(alice.token, corrupt.body.data._id);
    assert.equal(bad.status, 'Failed');
    assert.ok(bad.error);
  });

  it('lists only the caller’s documents and isolates users', async () => {
    const mine = await upload(bob.token, 'bob.txt', 'Bob private plan: launch on Friday.');
    await waitForDocument(bob.token, mine.body.data._id);

    const aliceList = await api('GET', '/documents', { token: alice.token });
    assert.ok(aliceList.body.data.every((d) => d.userId === alice.id));
    assert.ok(!aliceList.body.data.some((d) => d._id === mine.body.data._id));

    const id = mine.body.data._id;
    assert.equal((await api('GET', `/documents/${id}`, { token: alice.token })).status, 404);
    assert.equal((await api('PATCH', `/documents/${id}/rename`, { token: alice.token, body: { newName: 'pwned' } })).status, 404);
    assert.equal((await api('DELETE', `/documents/${id}`, { token: alice.token })).status, 404);
    assert.equal((await api('GET', `/documents/${id}`, { token: bob.token })).body.data.fileName, 'bob.txt');
  });

  it('renames documents and validates input', async () => {
    const up = await upload(alice.token, 'rename-me.txt', 'Some text to rename.');
    const id = up.body.data._id;
    const ok = await api('PATCH', `/documents/${id}/rename`, { token: alice.token, body: { newName: '  Renamed.txt  ' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.fileName, 'Renamed.txt');
    assert.equal((await api('PATCH', `/documents/${id}/rename`, { token: alice.token, body: { newName: '   ' } })).status, 400);
    assert.equal((await api('PATCH', '/documents/not-an-id/rename', { token: alice.token, body: { newName: 'x' } })).status, 404);
    assert.equal((await api('GET', '/documents/not-an-id', { token: alice.token })).status, 404);
  });

  it('deletes a document with its passages and frees storage', async () => {
    const before = (await api('GET', '/users/analytics', { token: alice.token })).body.data.storageUsedBytes;
    const up = await upload(alice.token, 'temp.txt', 'Temporary document content for deletion test.');
    const doc = await waitForDocument(alice.token, up.body.data._id);
    const mid = (await api('GET', '/users/analytics', { token: alice.token })).body.data.storageUsedBytes;
    assert.equal(mid, before + doc.fileSize);

    assert.equal((await api('DELETE', `/documents/${doc._id}`, { token: alice.token })).status, 200);
    assert.equal(await mongoose.model('DocumentChunk').countDocuments({ documentId: doc._id }), 0);
    const after = (await api('GET', '/users/analytics', { token: alice.token })).body.data.storageUsedBytes;
    assert.equal(after, before);
    const user = await mongoose.model('User').findById(alice.id);
    assert.ok(user.totalStorageUsed >= 0);
  });

  it('cleans up if a document is deleted while still processing', async () => {
    const big = 'The quick brown fox jumps over the lazy dog. '.repeat(6000); // ~270 KB → many chunks
    const up = await upload(alice.token, 'slow.txt', big);
    const id = up.body.data._id;
    assert.equal((await api('DELETE', `/documents/${id}`, { token: alice.token })).status, 200);
    await new Promise((r) => setTimeout(r, 4000));
    assert.equal(await mongoose.model('DocumentChunk').countDocuments({ documentId: id }), 0);
    assert.equal(await mongoose.model('Document').countDocuments({ _id: id }), 0);
  });

  it('enforces the 20-document limit', async () => {
    const u = await register();
    for (let i = 0; i < 20; i++) {
      const r = await upload(u.token, `doc-${i}.txt`, `Document number ${i}.`);
      assert.equal(r.status, 202, `upload ${i} failed: ${JSON.stringify(r.body)}`);
    }
    const over = await upload(u.token, 'doc-21.txt', 'One too many.');
    assert.equal(over.status, 403);
    assert.match(over.body.error, /limit/i);
  });

  it('enforces the 50 MB storage limit and rejects documents with too many passages', async () => {
    const u = await register();
    const chunk = Buffer.alloc(Math.floor(9.9 * 1024 * 1024), 'lorem ipsum ');
    let firstId;
    for (let i = 0; i < 5; i++) {
      const r = await upload(u.token, `huge-${i}.txt`, chunk);
      assert.equal(r.status, 202);
      firstId ??= r.body.data._id;
    }
    const over = await upload(u.token, 'one-more.txt', Buffer.alloc(1024 * 1024, 'x '));
    assert.equal(over.status, 403);
    assert.match(over.body.error, /Storage limit/);

    const huge = await waitForDocument(u.token, firstId);
    assert.equal(huge.status, 'Failed');
    assert.match(huge.error, /too long/);
  });

  it('marks documents interrupted by a restart as failed', async () => {
    const { recoverInterruptedDocuments } = require('../controllers/documentController');
    const Doc = mongoose.model('Document');
    const stuck = await Doc.create({ userId: alice.id, fileName: 'stuck.txt', fileSize: 1, status: 'Processing' });
    await recoverInterruptedDocuments();
    const after = await Doc.findById(stuck._id);
    assert.equal(after.status, 'Failed');
    assert.match(after.error, /interrupted/);
  });
});
