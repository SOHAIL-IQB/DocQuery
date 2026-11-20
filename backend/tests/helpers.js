/* Shared test harness: boots the real Express app on a random port against an
 * ephemeral in-memory MongoDB, with the real local embedding model and no LLM key. */
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
delete process.env.GROQ_API_KEY;
delete process.env.MONGO_URI;
process.env.VECTOR_SEARCH = 'local';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let server;
let base;
let counter = 0;

async function start() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'docquery-test' });
  const app = require('../app');
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
  return base;
}

async function stop() {
  // Let background document processing settle before tearing the DB down.
  await new Promise((r) => setTimeout(r, 300));
  server?.closeAllConnections?.();
  await new Promise((r) => (server ? server.close(r) : r()));
  await mongoose.disconnect();
  await mongod?.stop();
}

/** JSON request helper. Returns { status, body, headers }. */
async function api(method, url, { token, body, raw, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (raw !== undefined) {
    init.body = raw;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(base + url, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json, headers: res.headers };
}

async function register(overrides = {}) {
  counter += 1;
  const payload = {
    name: `Tester ${counter}`,
    email: `tester${counter}.${Date.now()}@example.test`,
    password: 'password123',
    ...overrides,
  };
  const res = await api('POST', '/auth/register', { body: payload });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { ...payload, token: res.body.data.token, id: res.body.data._id };
}

async function upload(token, fileName, content, type = 'text/plain') {
  const form = new FormData();
  form.append('document', new Blob([content], { type }), fileName);
  const res = await fetch(`${base}/documents/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', name));

async function waitForDocument(token, id, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    const { body } = await api('GET', `/documents/${id}`, { token });
    if (body?.data && body.data.status !== 'Processing') return body.data;
    if (Date.now() - start > timeoutMs) throw new Error(`document ${id} still processing`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

/** Streams a question and returns all parsed SSE events. */
async function ask(token, chatId, question, documentIds = [], { signal, onEvent } = {}) {
  const res = await fetch(`${base}/chat/message/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ chatId, question, documentIds }),
    signal,
  });
  if (!res.ok) return { status: res.status, body: await res.json(), events: [] };
  const events = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (line.startsWith('data: ')) {
        const ev = JSON.parse(line.slice(6));
        events.push(ev);
        onEvent?.(ev);
      }
    }
  }
  const answer = events.filter((e) => e.type === 'token').map((e) => e.value).join('');
  return { status: res.status, headers: res.headers, events, answer, sources: events.find((e) => e.type === 'sources')?.sources };
}

module.exports = { start, stop, api, register, upload, fixture, waitForDocument, ask, mongoose };
