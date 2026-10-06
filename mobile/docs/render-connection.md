# Step 1: connect mobile to the existing Render backend

Backend origin: https://laundryapp-lks6.onrender.com
Repository: https://github.com/taabishshaikh2/LaundryApp

## Completed locally

- Applied the approved native session adapter in server/src/routes/auth.js and server/src/utils/mobileSessions.js.
- Added server/test/mobileSessions.test.js for actual production-cookie regression checks.
- Set mobile/.env EXPO_PUBLIC_API_URL to the supplied Render origin; /api is appended by the mobile client.
- Saved mobile/AGENTS.md to preserve JavaScript/JSX and the user's requirement to keep the web client operational.
- Verified the hosted /api/health response and /api/ready: database connected, infrastructure ready, indexes/migrations current.
- 20 mobile tests, five backend adapter tests and JavaScript lint passed. The existing client/ has no diff.

## Deployment status

The adapter is not yet published or deployed. Automatic approval review rejected a command to publish the authentication changes to the public repository because applying the adapter was not specific authorization to publish that source. Explicit user approval to publish the three listed backend files is pending. No workaround was attempted.

Once publishing is approved, create a separate codex/mobile-session-adapter branch and a reviewable pull request containing only those backend files. Deploy the approved backend change through the Render service's configured branch. Confirm deployment from Render and repeat health/ready checks before claiming the hosted adapter is active.

Do not create live users or run reset/logout/order mutations against the supplied backend to test the adapter without a designated test account. This URL is the user's existing backend, not a verified isolated staging environment; mobile connected to it will see its existing shared data.

## Next stages

After the hosted adapter is active, connect the mobile app to the user's Expo project and set the preview API environment there. Then build an Android preview APK. No Expo project or APK has been created in this step.
