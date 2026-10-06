import * as SecureStore from 'expo-secure-store';
import { sessionSchema, userSchema } from '../contracts';
import { createSessionManager } from './session';
const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const key = 'dg.mobile.refresh.v1';
export const configured = Boolean(base);
async function request(path, body, method = 'POST', token) {
  if (!base) throw new Error('Set EXPO_PUBLIC_API_URL to your HTTPS backend URL and restart the app.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let response;
  try {
    response = await fetch(`${base}/api${path}`, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-DG-Client': 'mobile', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  finally { clearTimeout(timer); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status})`); error.status = response.status; error.code = data.code; throw error; }
  if (data.token) { const result = sessionSchema.safeParse(data); if (!result.success) throw new Error('The backend needs the mobile session adapter before native sign-in can work.'); return result.data; }
  if (data.user) data.user = userSchema.parse(data.user);
  return data;
}
export function makeClient(onChange) {
  return createSessionManager({ request, onChange, storage: { get: () => SecureStore.getItemAsync(key), set: (value) => SecureStore.setItemAsync(key, value), remove: () => SecureStore.deleteItemAsync(key) } });
}
