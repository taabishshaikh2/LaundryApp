import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { makeClient } from '../api/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState('');
  const [queries] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }));
  const client = useMemo(() => makeClient(next => { if (!next) queries.clear(); setUser(next); }), [queries]);
  async function restore() { setLoading(true); setStartupError(''); try { await client.refresh(); } catch (e) { if (e.status !== 401) setStartupError(e.message); } finally { setLoading(false); } }
  useEffect(() => { let active = true; client.refresh().catch(e => { if (active && e.status !== 401) setStartupError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [client]);
  return <QueryClientProvider client={queries}><Context.Provider value={{ user, loading, startupError, restore, client }}>{children}</Context.Provider></QueryClientProvider>;
}
export const useAuth = () => useContext(Context);
