# Mobile development boundaries

- Use JavaScript and JSX for application source.
- Keep mobile screens, navigation, styles and native integrations inside mobile/.
- Preserve the existing web client and its features. Do not edit client/ for mobile work without an explicit user request.
- Reuse the existing backend and production database; do not duplicate business logic or create a separate production database.
- Make shared backend additions backwards compatible with current web request/response and cookie behavior. Run web-contract regression checks before deployment.
- Work one stage at a time: hosted backend connection, Expo project configuration, then Android preview build. Do not claim a local edit is deployed or that bundling produced an installable APK.
