# Dhobi Ghat mobile — JavaScript / JSX

Separate Expo app using the existing ApnaLaundry backend. This milestone implements authentication/account security and read-only role dashboard shells. Booking, operational mutations, push and camera are later phases.

## Run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set EXPO_PUBLIC_API_URL to the backend origin, without /api. Values embedded in the app are public; never add Mongo/Cloudinary/Resend/JWT secrets here.
3. Review and apply the backend session proposal below before signing in.
4. Use `npx expo start` for local development. Use an Expo development build for native testing. A local development session needs the development server running; an EAS preview APK runs independently.
5. `npm test` exercises token refresh/logout/revocation. `npm run check:bundle` verifies Android JavaScript bundling.

## Backend proposal (not automatically applied)

`backend-proposal/routes/auth.js` is the original route file with a small native credential transport adapter. `backend-proposal/utils/mobileSessions.js` belongs at server/src/utils/mobileSessions.js. Compare source-sha256.json with the current server/src/routes/auth.js before replacing it; never overwrite later server changes. Review the diff and test cookie clients plus native clients before deployment.

Mobile requests send X-DG-Client: mobile. Successful login/register/2FA/refresh responses include refreshToken for SecureStore. Web clients retain HttpOnly refresh cookies and the existing JSON shape. Both use the same users, sessions, token rotation, rate limits and role checks. The marker is a transport choice, not proof of identity. No existing backend files have been changed by this app scaffold.

## Remote testing

Deploy the same server code to a staging HTTPS host with a separate test database and test notification credentials. Configure EAS preview environment EXPO_PUBLIC_API_URL to this staging origin. Configure production to the existing production origin. Both web and mobile production share that database.

Run `eas init` in your Expo account, confirm Android package/iOS bundle identity, then `eas build --platform android --profile preview`. Share its APK with testers; no local computer is required. Production uses `--profile production` and Play Console testing before public release. Expo, hosting and integration quotas are independent. Push credentials, notification setup and Sentry configuration are later phases.

Docs: docs/audit.md, docs/screens.md, docs/endpoints.md and docs/web-api-actions.md. The generated app identifiers are proposed defaults; verify ownership before publishing.
