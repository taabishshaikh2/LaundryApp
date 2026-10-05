# Production infrastructure runbook

## Application checks now included

- `GET /api/health` confirms that the Node process is responding.
- `GET /api/ready` verifies MongoDB with a live ping and reports index and data-migration status.
- The server creates missing declared indexes on startup when `SYNC_DATABASE_INDEXES=true`. It never deletes unexpected indexes.
- `npm run db:check --prefix server` checks declared indexes without changing the database.
- `npm run db:indexes --prefix server` creates missing declared indexes and checks them again.
- Legacy MongoDB base64 photos appear as the non-blocking `cloudinary-photo-storage-v1` migration until `npm run migrate:photos --prefix server` completes.

Keep `REQUIRE_MIGRATIONS_CURRENT=false` during the pilot because legacy photos remain readable. Change it to `true` only after the Cloudinary migration is complete if a pending migration should fail readiness checks.

## Sentry

1. Create a Sentry **Node.js / Express** project.
2. Add these variables to the Render backend service:

   ```env
   SENTRY_DSN=your_server_project_dsn
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.05
   ```

3. Redeploy. Server exceptions and startup failures will be reported automatically. Request bodies and default personally identifying information are not sent by this configuration.
4. In Sentry, create alerts for a new issue, a regression, and an elevated error count. Send them to the administrator's email.

Leaving `SENTRY_DSN` empty disables Sentry without breaking the application.

## Render

In the Render backend service, open **Settings → Health Check Path** and enter:

```text
/api/ready
```

Render will reject an unhealthy deployment and restart an instance that repeatedly fails the check. Use `/api/health` with any external uptime monitor if you also want an outside-in availability check.

## MongoDB Atlas backups and alerts

Atlas automated backups are unavailable on free M0 clusters. Before handling production customer data, upgrade to an Atlas tier that includes Cloud Backups, enable continuous cloud backup, choose a retention policy, and perform a test restore.

For the free-tier pilot, run the encrypted application backup from a trusted computer and move the generated files to separate secure storage:

```powershell
cd D:\Work\ApnaLaundry\server
npm run backup
```

The command uses `MONGODB_URI`, `BACKUP_DIRECTORY`, and `BACKUP_ENCRYPTION_KEY`. Do not store the encryption key beside the backup files.

In Atlas **Project Settings → Alerts**, configure email notifications for:

- `Logical Size` approaching 80% of the free-cluster allowance.
- No primary / cluster unavailable.
- Connections approaching the plan limit.

## Cloudinary usage alerts

Cloudinary automatically warns account administrators near 90% and again at 100% of plan usage. In **My Profile → Email Preferences**, enable account usage reports and confirm that the billing or administrator email is monitored. Review storage, bandwidth, and transformations under **Settings → Billing** once per week during the pilot.

## Deployment environment

Recommended backend values:

```env
NODE_ENV=production
SYNC_DATABASE_INDEXES=true
REQUIRE_MIGRATIONS_CURRENT=false
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05
```

Keep `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_URL`, `SENTRY_DSN`, and provider secrets only in Render's backend environment.

