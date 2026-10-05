import "dotenv/config";

export const sentryEnabled = Boolean(process.env.SENTRY_DSN);
export let Sentry = null;

if (sentryEnabled) {
  Sentry = await import("@sentry/node");
  const requestedSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05);
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.RENDER_GIT_COMMIT || process.env.APP_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: Number.isFinite(requestedSampleRate) ? Math.min(1, Math.max(0, requestedSampleRate)) : 0.05,
  });
}

