import { getRefreshCookie, setRefreshCookie } from './authCookies.js';
// This header chooses credential transport only; it grants no extra permissions.
export const isMobileClient = req => req.headers['x-dg-client'] === 'mobile';
export function getSessionRefreshToken(req) {
  if (!isMobileClient(req)) return getRefreshCookie(req);
  return typeof req.body?.refreshToken === 'string' && req.body.refreshToken.length <= 256 ? req.body.refreshToken : '';
}
export function sendSessionResponse(req, res, session, user, status = 200) {
  res.set('Cache-Control', 'no-store');
  const body = { token: session.token, expiresInMinutes: session.expiresInMinutes, user };
  if (isMobileClient(req)) body.refreshToken = session.refreshToken;
  else setRefreshCookie(res, session.refreshToken);
  return res.status(status).json(body);
}
