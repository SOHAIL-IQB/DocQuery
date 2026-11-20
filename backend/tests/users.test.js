const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, register, upload, waitForDocument, ask, mongoose } = require('./helpers');

describe('users', () => {
  before(start);
  after(stop);

  it('reports accurate dashboard analytics', async () => {
    const u = await register();
    const empty = (await api('GET', '/users/analytics', { token: u.token })).body.data;
    assert.deepEqual(
      { d: empty.totalDocuments, c: empty.totalChats, q: empty.questionsAsked, s: empty.storageUsedBytes },
      { d: 0, c: 0, q: 0, s: 0 },
    );

    const doc = await upload(u.token, 'a.txt', 'Alpha beta gamma delta.');
    await waitForDocument(u.token, doc.body.data._id);
    const chatId = (await api('POST', '/chat/create', { token: u.token, body: {} })).body.data._id;
    await ask(u.token, chatId, 'hi');
    await ask(u.token, chatId, 'What is alpha?');

    const s = (await api('GET', '/users/analytics', { token: u.token })).body.data;
    assert.equal(s.totalDocuments, 1);
    assert.equal(s.readyDocuments, 1);
    assert.equal(s.totalChats, 1);
    assert.equal(s.questionsAsked, 2);
    assert.equal(s.storageUsedBytes, doc.body.data.fileSize);
    assert.ok(s.totalChunks >= 1);
    assert.equal(s.storageLimitBytes, 50 * 1024 * 1024);
  });

  it('updates the profile and ignores invalid values', async () => {
    const u = await register();
    const ok = await api('PATCH', '/users/profile', { token: u.token, body: { name: '  Grace Hopper  ', avatar: 'avatar5' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.name, 'Grace Hopper');
    assert.equal(ok.body.data.avatar, 'avatar5');

    const bad = await api('PATCH', '/users/profile', { token: u.token, body: { name: '   ', avatar: '<script>' } });
    assert.equal(bad.body.data.name, 'Grace Hopper');
    assert.equal(bad.body.data.avatar, 'avatar5');

    const long = await api('PATCH', '/users/profile', { token: u.token, body: { name: 'x'.repeat(200) } });
    assert.equal(long.status, 200);
    assert.equal(long.body.data.name.length, 50);

    const email = await api('PATCH', '/users/profile', { token: u.token, body: { email: 'hijack@example.test' } });
    assert.equal(email.body.data.email, u.email, 'email must not be changeable via profile');
    assert.equal((await api('PATCH', '/users/profile', { token: u.token })).status, 200, 'empty body must not crash');
  });

  it('changes the password with proper validation', async () => {
    const u = await register();
    const wrong = await api('POST', '/users/change-password', { token: u.token, body: { currentPassword: 'nope', newPassword: 'newpass123' } });
    assert.equal(wrong.status, 400, 'wrong current password must be 400 so the UI does not log the user out');
    const short = await api('POST', '/users/change-password', { token: u.token, body: { currentPassword: u.password, newPassword: '123' } });
    assert.equal(short.status, 400);
    const missing = await api('POST', '/users/change-password', { token: u.token });
    assert.equal(missing.status, 400);

    const ok = await api('POST', '/users/change-password', { token: u.token, body: { currentPassword: u.password, newPassword: 'newpass123' } });
    assert.equal(ok.status, 200);
    assert.equal((await api('POST', '/auth/login', { body: { email: u.email, password: u.password } })).status, 401);
    assert.equal((await api('POST', '/auth/login', { body: { email: u.email, password: 'newpass123' } })).status, 200);
  });

  it('deletes the account and every piece of its data, leaving others untouched', async () => {
    const victim = await register();
    const other = await register();
    for (const t of [victim.token, other.token]) {
      const d = await upload(t, 'f.txt', 'Some content to embed for deletion testing.');
      await waitForDocument(t, d.body.data._id);
      const c = (await api('POST', '/chat/create', { token: t, body: {} })).body.data._id;
      await ask(t, c, 'What content is there?');
    }
    const counts = async (userId) => {
      const M = (n) => mongoose.model(n);
      const chatIds = await M('Chat').find({ userId }).distinct('_id');
      return {
        users: await M('User').countDocuments({ _id: userId }),
        docs: await M('Document').countDocuments({ userId }),
        chunks: await M('DocumentChunk').countDocuments({ userId }),
        chats: chatIds.length,
        messages: await M('Message').countDocuments({ chatId: { $in: chatIds } }),
      };
    };
    const otherBefore = await counts(other.id);

    const res = await api('DELETE', '/users/account', { token: victim.token });
    assert.equal(res.status, 200);
    assert.deepEqual(await counts(victim.id), { users: 0, docs: 0, chunks: 0, chats: 0, messages: 0 });
    const liveChats = await mongoose.model('Chat').distinct('_id');
    assert.equal(await mongoose.model('Message').countDocuments({ chatId: { $nin: liveChats } }), 0, 'orphaned messages left behind');
    const liveDocs = await mongoose.model('Document').distinct('_id');
    assert.equal(await mongoose.model('DocumentChunk').countDocuments({ documentId: { $nin: liveDocs } }), 0, 'orphaned chunks left behind');
    assert.deepEqual(await counts(other.id), otherBefore);
    assert.equal((await api('GET', '/documents', { token: victim.token })).status, 401);
  });
});
