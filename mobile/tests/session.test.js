import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionManager } from '../src/api/session.js';
const session = n => ({ token: `access-${n}`, refreshToken: `refresh-${n}`, user: { id: 'one', role: 'CUSTOMER' } });
const unauthorized = code => Object.assign(new Error('Expired'), { status: 401, code });
function fixture(request) { let saved = null; let current = null; const manager = createSessionManager({ request, storage: { get: async () => saved, set: async value => { saved = value; }, remove: async () => { saved = null; } }, onChange: value => { current = value; } }); return { manager, saved: () => saved, user: () => current }; }
test('concurrent 401 responses rotate once and replay with the new access token', async () => {
  let rotations = 0; let retries = 0;
  const f = fixture(async (path, body, method, token) => { if (path === '/auth/refresh') { rotations++; await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(body.refreshToken, 'refresh-1'); return session(2); } if (token === 'access-1') throw unauthorized(); assert.equal(token, 'access-2'); retries++; return { ok: true }; });
  await f.manager.accept(session(1)); await Promise.all(Array.from({ length: 5 }, () => f.manager.call('/orders'))); assert.equal(rotations, 1); assert.equal(retries, 5); assert.equal(f.saved(), 'refresh-2');
});
test('late 401 from old access token uses the already refreshed token', async () => {
  let rotations = 0; let release; const gate = new Promise(resolve => { release = resolve; });
  const f = fixture(async (path, body, method, token) => { if (path === '/auth/refresh') { rotations++; return session(2); } if (token === 'access-1') { if (path === '/slow') await gate; throw unauthorized(); } return { ok: true }; });
  await f.manager.accept(session(1)); const slow = f.manager.call('/slow'); await f.manager.call('/fast'); release(); await slow; assert.equal(rotations, 1);
});
test('failed refresh revokes local credentials', async () => { const f = fixture(async () => { throw unauthorized(); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.call('/orders')); assert.equal(f.saved(), null); assert.equal(f.user(), null); });
test('offline refresh retains credential for a later retry', async () => { const f = fixture(async () => { throw new Error('Offline'); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.refresh()); assert.equal(f.saved(), 'refresh-1'); });
test('explicit session revocation clears credentials without refresh', async () => { let calls = 0; const f = fixture(async () => { calls++; throw unauthorized('SESSION_REVOKED'); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.call('/orders')); assert.equal(calls, 1); assert.equal(f.saved(), null); });
test('invalid login does not invoke refresh or erase a stored session', async () => { const f = fixture(async () => { throw unauthorized(); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.signIn('/auth/login', {})); assert.equal(f.saved(), 'refresh-1'); });
test('second 401 is terminal rather than an infinite refresh loop', async () => { let rotations = 0; const f = fixture(async path => { if (path === '/auth/refresh') { rotations++; return session(2); } throw unauthorized(); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.call('/orders')); assert.equal(rotations, 1); assert.equal(f.saved(), null); });
test('logout clears local credentials even if server is unreachable', async () => { const f = fixture(async () => { throw new Error('Offline'); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.logout()); assert.equal(f.saved(), null); });
test('logout-all preserves session on network failure so user can retry', async () => { const f = fixture(async () => { throw new Error('Offline'); }); await f.manager.accept(session(1)); await assert.rejects(f.manager.logout(true)); assert.equal(f.saved(), 'refresh-1'); });
test('late refresh cannot restore credentials after local clearing', async () => { let release; const gate = new Promise(resolve => { release = resolve; }); const f = fixture(async () => { await gate; return session(2); }); await f.manager.accept(session(1)); const pending = f.manager.refresh(); await new Promise(resolve => setTimeout(resolve, 1)); await f.manager.clear(); release(); await assert.rejects(pending); assert.equal(f.saved(), null); assert.equal(f.user(), null); });
test('admin second-factor challenge stores no credentials', async () => { const f = fixture(async () => ({ requiresTwoFactor: true, challengeToken: 'challenge' })); const data = await f.manager.signIn('/auth/login', {}); assert.equal(data.requiresTwoFactor, true); assert.equal(f.saved(), null); });
