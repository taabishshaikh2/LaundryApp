import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'production';
const { getSessionRefreshToken, sendSessionResponse } = await import('../src/utils/mobileSessions.js');
const session = { token: 'access-fixture', refreshToken: 'refresh-fixture', expiresInMinutes: 20 };
function response() { return { cookies: [], set(key, value) { this[key] = value; }, cookie(...args) { this.cookies.push(args); }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
test('web response preserves original JSON and production cookie options', () => {
  const res = response(); const user = { id: 'fixture' }; sendSessionResponse({ headers: {} }, res, session, user);
  assert.deepEqual(res.body, { token: session.token, expiresInMinutes: 20, user });
  const [name, value, options] = res.cookies[0]; assert.equal(name, '__Host-dg_refresh'); assert.equal(value, session.refreshToken);
  assert.equal(options.httpOnly, true); assert.equal(options.secure, true); assert.equal(options.sameSite, 'none'); assert.equal(options.path, '/');
});
test('web ignores native token body and reads its existing cookie', () => { assert.equal(getSessionRefreshToken({ headers: { cookie: '__Host-dg_refresh=web-token' }, body: { refreshToken: 'ignored' } }), 'web-token'); });
test('native response returns refresh token and never sets browser cookie', () => { const res = response(); sendSessionResponse({ headers: { 'x-dg-client': 'mobile' } }, res, session, { id: 'fixture' }, 201); assert.equal(res.body.refreshToken, session.refreshToken); assert.equal(res.cookies.length, 0); assert.equal(res.statusCode, 201); assert.equal(res['Cache-Control'], 'no-store'); });
test('native token lookup does not fall back to browser cookies', () => { assert.equal(getSessionRefreshToken({ headers: { 'x-dg-client': 'mobile', cookie: '__Host-dg_refresh=ignored' }, body: { refreshToken: 'native' } }), 'native'); assert.equal(getSessionRefreshToken({ headers: { 'x-dg-client': 'mobile', cookie: '__Host-dg_refresh=ignored' }, body: {} }), ''); });
test('invalid native token types and oversized values are rejected', () => { for (const value of [null, {}, 42, 'x'.repeat(257)]) assert.equal(getSessionRefreshToken({ headers: { 'x-dg-client': 'mobile' }, body: { refreshToken: value } }), ''); });
