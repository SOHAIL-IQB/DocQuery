const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { start, stop, api, register } = require('./helpers');

describe('auth', () => {
  before(start);
  after(stop);

  it('registers a user, keeps the name and normalizes the email', async () => {
    const res = await api('POST', '/auth/register', {
      body: { name: '  Ada Lovelace ', email: '  Ada.L@Example.TEST ', password: 'secret12' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.name, 'Ada Lovelace');
    assert.equal(res.body.data.email, 'ada.l@example.test');
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.password, undefined, 'password must never be returned');
  });

  it('rejects duplicate emails regardless of case', async () => {
    const u = await register();
    const res = await api('POST', '/auth/register', { body: { email: u.email.toUpperCase(), password: 'password123' } });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /already exists/);
  });

  it('handles two simultaneous sign-ups with the same email without a 500', async () => {
    const email = `race.${Date.now()}@example.test`;
    const results = await Promise.all(
      [1, 2, 3].map(() => api('POST', '/auth/register', { body: { email, password: 'password123' } })),
    );
    const codes = results.map((r) => r.status).sort();
    assert.equal(codes.filter((c) => c === 201).length, 1, `expected exactly one success, got ${codes}`);
    assert.ok(codes.every((c) => c === 201 || c === 400), `unexpected codes ${codes}`);
  });

  it('validates email and password on sign-up', async () => {
    assert.equal((await api('POST', '/auth/register', { body: { email: 'not-an-email', password: 'password123' } })).status, 400);
    assert.equal((await api('POST', '/auth/register', { body: { email: 'ok@example.test', password: '123' } })).status, 400);
    assert.equal((await api('POST', '/auth/register', { body: { email: { $gt: '' }, password: 'password123' } })).status, 400);
  });

  it('returns 400 (not 500) for a request with no body', async () => {
    const res = await api('POST', '/auth/register');
    assert.equal(res.status, 400);
    const res2 = await api('POST', '/auth/login');
    assert.equal(res2.status, 400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await api('POST', '/auth/login', { raw: '{"email":', headers: { 'Content-Type': 'application/json' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it('logs in with any email casing and rejects wrong passwords', async () => {
    const u = await register();
    const ok = await api('POST', '/auth/login', { body: { email: u.email.toUpperCase(), password: u.password } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.email, u.email);

    const bad = await api('POST', '/auth/login', { body: { email: u.email, password: 'wrong-password' } });
    assert.equal(bad.status, 401);
    const missing = await api('POST', '/auth/login', { body: { email: u.email } });
    assert.equal(missing.status, 400);
    const unknown = await api('POST', '/auth/login', { body: { email: 'nobody@example.test', password: 'password123' } });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.error, bad.body.error, 'must not reveal whether the email exists');
  });

  it('rejects NoSQL-injection style login payloads', async () => {
    const res = await api('POST', '/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
    assert.ok([400, 401].includes(res.status));
  });

  it('protects /me: no token, bad token, expired token, deleted user', async () => {
    assert.equal((await api('GET', '/auth/me')).status, 401);
    assert.equal((await api('GET', '/auth/me', { token: 'garbage' })).status, 401);

    const u = await register();
    const expired = jwt.sign({ id: u.id }, process.env.JWT_SECRET, { expiresIn: -10 });
    assert.equal((await api('GET', '/auth/me', { token: expired })).status, 401);
    const forged = jwt.sign({ id: u.id }, 'some-other-secret');
    assert.equal((await api('GET', '/auth/me', { token: forged })).status, 401);

    const me = await api('GET', '/auth/me', { token: u.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.name, u.name);

    await api('DELETE', '/users/account', { token: u.token });
    assert.equal((await api('GET', '/auth/me', { token: u.token })).status, 401);
  });

  it('returns JSON 404s for unknown API routes', async () => {
    const res = await api('GET', '/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('does not count successful logins towards the brute-force limit', async () => {
    const u = await register();
    for (let i = 0; i < 35; i++) {
      const res = await api('POST', '/auth/login', { body: { email: u.email, password: u.password } });
      assert.equal(res.status, 200, `successful login #${i + 1} was blocked`);
    }
  });

  it('rate-limits repeated failed logins', async () => {
    const u = await register();
    let limited = false;
    for (let i = 0; i < 40 && !limited; i++) {
      const res = await api('POST', '/auth/login', { body: { email: u.email, password: 'nope-nope' } });
      if (res.status === 429) limited = true;
    }
    assert.ok(limited, 'expected a 429 after many failed attempts');
  });
});
