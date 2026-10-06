import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Isolate the proposed adapter's cookie dependency without loading a server or DB.
const source = fs.readFileSync(new URL('../backend-proposal/utils/mobileSessions.js', import.meta.url), 'utf8').replace("import { getRefreshCookie, setRefreshCookie } from './authCookies.js';", "const getRefreshCookie = req => req.cookie; const setRefreshCookie = (res, token) => { res.cookie = token; };");
const { getSessionRefreshToken, sendSessionResponse } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function response() { return { set(k, v) { this[k] = v; }, status(v) { this.statusCode = v; return this; }, json(v) { this.body = v; return this; } }; }
const data = { token: 'access', refreshToken: 'secret', expiresInMinutes: 20 };
test('web responses retain cookies and never expose refresh in JSON', () => { const res = response(); sendSessionResponse({ headers: {} }, res, data, { id: 'u' }); assert.equal(res.cookie, 'secret'); assert.equal(res.body.refreshToken, undefined); assert.equal(res['Cache-Control'], 'no-store'); });
test('mobile responses expose credential without setting browser cookie', () => { const res = response(); sendSessionResponse({ headers: { 'x-dg-client': 'mobile' } }, res, data, { id: 'u' }, 201); assert.equal(res.body.refreshToken, 'secret'); assert.equal(res.cookie, undefined); assert.equal(res.statusCode, 201); });
test('mobile cannot fall back to a browser credential', () => { assert.equal(getSessionRefreshToken({ headers: { 'x-dg-client': 'mobile' }, cookie: 'web', body: {} }), ''); });
test('web ignores body credential and mobile accepts only bounded strings', () => { assert.equal(getSessionRefreshToken({ headers: {}, cookie: 'web', body: { refreshToken: 'mobile' } }), 'web'); for (const value of [null, {}, 'x'.repeat(257)]) assert.equal(getSessionRefreshToken({ headers: { 'x-dg-client': 'mobile' }, body: { refreshToken: value } }), ''); });
