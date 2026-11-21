const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, stop, api, register, upload, fixture, waitForDocument, ask, mongoose } = require('./helpers');

describe('chat', () => {
  let alice;
  let bob;
  let handbookId;
  let invoiceId;
  let bobDocId;

  before(async () => {
    await start();
    alice = await register();
    bob = await register();
    const h = await upload(alice.token, 'handbook.txt', fixture('handbook.txt'));
    const i = await upload(alice.token, 'invoice.pdf', fixture('invoice.pdf'), 'application/pdf');
    const b = await upload(bob.token, 'bob-secret.txt', 'Bob confidential: the vault code is 9142 and vacation policy is unlimited.');
    handbookId = h.body.data._id;
    invoiceId = i.body.data._id;
    bobDocId = b.body.data._id;
    await Promise.all([waitForDocument(alice.token, handbookId), waitForDocument(alice.token, invoiceId), waitForDocument(bob.token, bobDocId)]);
  });
  after(stop);

  const newChat = async (token) => (await api('POST', '/chat/create', { token, body: {} })).body.data._id;

  it('creates chats with a default title, even without a request body', async () => {
    const res = await api('POST', '/chat/create', { token: alice.token });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, 'New Chat');
  });

  it('streams an answer: meta → sources → tokens → done, and persists both messages', async () => {
    const chatId = await newChat(alice.token);
    const r = await ask(alice.token, chatId, 'How many days of paid vacation do employees get?');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/event-stream/);
    const types = r.events.map((e) => e.type);
    assert.equal(types[0], 'meta');
    assert.equal(types[1], 'sources');
    assert.equal(types.at(-1), 'done');
    assert.ok(types.includes('token'));
    assert.equal(r.events[0].chatTitle, 'How many days of paid vacation do employees get?');

    assert.ok(r.sources.length >= 1);
    assert.equal(r.sources[0].documentId, handbookId, 'best source should be the handbook');
    assert.equal(r.sources[0].fileName, 'handbook.txt');
    assert.match(r.answer, /25 days/);

    const history = await api('GET', `/chat/${chatId}`, { token: alice.token });
    assert.equal(history.body.data.length, 2);
    assert.deepEqual(history.body.data.map((m) => m.role), ['user', 'assistant']);
    assert.equal(history.body.data[1]._id, r.events.at(-1).messageId);
    assert.equal(history.body.data[1].sources.length, r.sources.length);
  });

  it('truncates long auto-titles', async () => {
    const chatId = await newChat(alice.token);
    const q = 'Please tell me everything that the handbook says about parental leave for primary caregivers';
    const r = await ask(alice.token, chatId, q);
    assert.ok(r.events[0].chatTitle.length <= 49);
    assert.ok(r.events[0].chatTitle.endsWith('…'));
  });

  it('respects the document scope', async () => {
    const chatId = await newChat(alice.token);
    const r = await ask(alice.token, chatId, 'What is the total amount due on the invoice?', [invoiceId]);
    assert.ok(r.sources.length >= 1);
    assert.ok(r.sources.every((s) => s.documentId === invoiceId));
    assert.match(r.answer, /4,860/);
  });

  it('never returns another user’s passages, even when their document IDs are passed', async () => {
    const chatId = await newChat(alice.token);
    const r = await ask(alice.token, chatId, 'What is the vault code?', [bobDocId]);
    assert.equal(r.sources.length, 0);
    assert.doesNotMatch(r.answer, /9142/);

    const all = await ask(alice.token, chatId, 'What is the vault code?');
    assert.ok(all.sources.every((s) => s.documentId !== bobDocId));
    assert.doesNotMatch(all.answer, /9142/);
  });

  it('answers greetings without searching documents', async () => {
    const chatId = await newChat(alice.token);
    const r = await ask(alice.token, chatId, 'Hello!');
    assert.equal(r.sources.length, 0);
    assert.match(r.answer, /DocQuery/);
  });

  it('says so when nothing relevant exists', async () => {
    const u = await register();
    const chatId = await newChat(u.token);
    const r = await ask(u.token, chatId, 'What is the vacation policy?');
    assert.equal(r.sources.length, 0);
    assert.match(r.answer, /couldn't find anything relevant/);
  });

  it('supports the non-streaming endpoint', async () => {
    const chatId = await newChat(alice.token);
    const res = await api('POST', '/chat/message', { token: alice.token, body: { chatId, question: 'How large is the learning budget?' } });
    assert.equal(res.status, 201);
    assert.match(res.body.data.answer, /1,200/);
    assert.ok(res.body.data.sources.length >= 1);
  });

  it('validates message payloads', async () => {
    const chatId = await newChat(alice.token);
    assert.equal((await api('POST', '/chat/message/stream', { token: alice.token, body: { chatId } })).status, 400);
    assert.equal((await api('POST', '/chat/message/stream', { token: alice.token, body: { chatId, question: '   ' } })).status, 400);
    assert.equal((await api('POST', '/chat/message/stream', { token: alice.token, body: { chatId, question: 'x'.repeat(4001) } })).status, 400);
    assert.equal((await api('POST', '/chat/message/stream', { token: alice.token, body: { chatId: 'nope', question: 'hi' } })).status, 404);
    assert.equal((await api('POST', '/chat/message', { token: alice.token, body: { chatId: 'aaaaaaaaaaaa', question: 'hi' } })).status, 404);
    assert.equal((await api('POST', '/chat/message', { token: alice.token, body: { chatId: { $ne: null }, question: 'hi' } })).status, 404);
    for (const [method, url] of [['GET', '/chat/aaaaaaaaaaaa'], ['PATCH', '/chat/not-an-id/rename'], ['DELETE', '/chat/not-an-id']]) {
      const res = await api(method, url, { token: alice.token, ...(method === 'PATCH' ? { body: { title: 'x' } } : {}) });
      assert.equal(res.status, 404, `${method} ${url}`);
      assert.equal(res.body.error, 'Chat not found');
    }
    assert.equal((await api('POST', '/chat/message/stream', { token: alice.token })).status, 400);
    assert.equal((await api('POST', '/chat/message/stream', { body: { chatId, question: 'hi' } })).status, 401);
  });

  it('blocks access to other users’ chats', async () => {
    const chatId = await newChat(alice.token);
    await ask(alice.token, chatId, 'How long is parental leave?');
    assert.equal((await api('GET', `/chat/${chatId}`, { token: bob.token })).status, 403);
    assert.equal((await api('PATCH', `/chat/${chatId}/rename`, { token: bob.token, body: { title: 'x' } })).status, 403);
    assert.equal((await api('DELETE', `/chat/${chatId}`, { token: bob.token })).status, 403);
    assert.equal((await api('POST', '/chat/message/stream', { token: bob.token, body: { chatId, question: 'hi' } })).status, 403);
    const bobChats = await api('GET', '/chat', { token: bob.token });
    assert.ok(!bobChats.body.data.some((c) => c._id === chatId));
  });

  it('renames and deletes chats, cascading messages', async () => {
    const chatId = await newChat(alice.token);
    await ask(alice.token, chatId, 'hi');
    const renamed = await api('PATCH', `/chat/${chatId}/rename`, { token: alice.token, body: { title: '  My chat  ' } });
    assert.equal(renamed.body.data.title, 'My chat');
    assert.equal((await api('PATCH', `/chat/${chatId}/rename`, { token: alice.token, body: { title: '' } })).status, 400);

    assert.equal((await api('DELETE', `/chat/${chatId}`, { token: alice.token })).status, 200);
    assert.equal(await mongoose.model('Message').countDocuments({ chatId }), 0);
    assert.equal((await api('GET', `/chat/${chatId}`, { token: alice.token })).status, 404);
  });

  it('does not reorder chats when one is renamed', async () => {
    const a = await newChat(alice.token);
    await new Promise((r) => setTimeout(r, 20));
    const b = await newChat(alice.token);
    await api('PATCH', `/chat/${a}/rename`, { token: alice.token, body: { title: 'Renamed' } });
    const list = (await api('GET', '/chat', { token: alice.token })).body.data.map((c) => c._id);
    assert.ok(list.indexOf(b) < list.indexOf(a), 'rename must not bump the chat');
  });

  it('lists chats most-recently-active first', async () => {
    const a = await newChat(alice.token);
    const b = await newChat(alice.token);
    await new Promise((r) => setTimeout(r, 20));
    await ask(alice.token, a, 'hi');
    const list = (await api('GET', '/chat', { token: alice.token })).body.data.map((c) => c._id);
    assert.ok(list.indexOf(a) < list.indexOf(b));
  });

  it('survives the client aborting mid-stream and keeps working', async () => {
    const chatId = await newChat(alice.token);
    const controller = new AbortController();
    let tokens = 0;
    await ask(alice.token, chatId, 'Summarize the vacation and parental leave policies', [], {
      signal: controller.signal,
      onEvent: (e) => {
        if (e.type === 'token' && ++tokens === 3) controller.abort();
      },
    }).catch((err) => assert.equal(err.name, 'AbortError'));

    await new Promise((r) => setTimeout(r, 500));
    const history = (await api('GET', `/chat/${chatId}`, { token: alice.token })).body.data;
    assert.equal(history[0].role, 'user');
    assert.equal(history[1]?.role, 'assistant', 'a stopped turn must still be recorded');
    assert.match(history[1].content, /response stopped|Stopped/);

    const again = await ask(alice.token, chatId, 'How large is the learning budget?');
    assert.equal(again.events.at(-1).type, 'done');
  });

  it('records a turn stopped before any text arrived', async () => {
    const chatId = await newChat(alice.token);
    const controller = new AbortController();
    await ask(alice.token, chatId, 'How large is the learning budget?', [], {
      signal: controller.signal,
      onEvent: (e) => e.type === 'meta' && controller.abort(),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 800));
    const history = (await api('GET', `/chat/${chatId}`, { token: alice.token })).body.data;
    assert.deepEqual(history.map((m) => m.role), ['user', 'assistant']);
  });

  it('rate-limits message spam per user', async () => {
    const u = await register();
    const chatId = await newChat(u.token);
    const codes = [];
    for (let i = 0; i < 22; i++) {
      codes.push((await api('POST', '/chat/message', { token: u.token, body: { chatId, question: 'hi' } })).status);
    }
    assert.ok(codes.slice(0, 20).every((c) => c === 201), codes.join(','));
    assert.equal(codes.at(-1), 429);
  });
});
