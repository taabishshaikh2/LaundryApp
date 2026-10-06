// Framework-independent session engine; inject HTTP and secure storage for tests.
export function createSessionManager({ request, storage, onChange = () => {} }) {
  let access = null;
  let user = null;
  let refreshFlight = null;
  let generation = 0;
  let storageFlight = Promise.resolve();
  const store = action => { const next = storageFlight.then(action); storageFlight = next.catch(() => {}); return next; };
  const publish = () => onChange(user);
  async function accept(data, expected = generation) {
    if (expected !== generation) throw new Error('Session changed. Please sign in again.');
    await store(async () => { if (expected !== generation) throw new Error('Session changed.'); await storage.set(data.refreshToken); });
    if (expected !== generation) throw new Error('Session changed.');
    access = data.token; user = data.user; publish(); return user;
  }
  async function clear() { generation += 1; access = null; user = null; publish(); await store(() => storage.remove()); }
  async function refresh() {
    if (refreshFlight) return refreshFlight;
    const expected = generation;
    refreshFlight = (async () => {
      const refreshToken = await storage.get();
      if (!refreshToken) return null;
      try { const data = await request('/auth/refresh', { refreshToken }); await accept(data, expected); return data.token; }
      catch (error) { if (error.status === 401 && expected === generation) await clear(); throw error; }
    })().finally(() => { refreshFlight = null; });
    return refreshFlight;
  }
  async function call(path, body, method = 'GET') {
    const expected = generation;
    const usedToken = access;
    try { return await request(path, body, method, usedToken); }
    catch (error) {
      if (error.status !== 401 || !usedToken || expected !== generation) throw error;
      if (error.code === 'SESSION_REVOKED') { await clear(); throw error; }
      const token = access !== usedToken ? access : await refresh();
      if (!token || expected !== generation) throw error;
      // Retry once only. Never refresh login failures or loop on a second 401.
      try { return await request(path, body, method, token); }
      catch (retryError) { if (retryError.status === 401 && expected === generation) await clear(); throw retryError; }
    }
  }
  return {
    refresh, call, accept, clear,
    async signIn(path, body) { const expected = generation; const data = await request(path, body); if (data.requiresTwoFactor) return data; await accept(data, expected); return data; },
    async logout(all = false) {
      if (all) { await call('/auth/logout-all', {}, 'POST'); await clear(); return; }
      // Let any already-started rotation finish so logout revokes the newest credential.
      if (refreshFlight) { try { await refreshFlight; } catch { /* local clear still runs */ } }
      const refreshToken = await storage.get();
      await clear();
      await request('/auth/logout', { refreshToken });
    },
    async updateUser() { const expected = generation; const data = await call('/auth/me'); if (expected === generation) { user = data.user; publish(); } return user; },
  };
}
