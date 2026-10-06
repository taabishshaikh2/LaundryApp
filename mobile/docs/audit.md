# Mobile audit and implementation scope

Reference: D:/Work/ApnaLaundry. This is a source-code audit, not a certification of production readiness. No production services were called and no data was mutated.

## Design

Use redesign.css tokens: navy #172a3a, cream #f7f5ef, paper #fffefa, gold #cfb27c, ink #202f3b, muted #627079, line #e4e3dc. Use native scroll views, safe areas, keyboard avoidance, readable type and 48px or larger controls. Adapt desktop tables to mobile cards in subsequent phases.

## Roles and permissions

- CUSTOMER: public registration always creates this role; survey onboarding gates web customer screens. Own orders, cancellation, pricing revision responses, delivery OTP, account, support, notifications and retention features.
- RIDER: assigned order queries require riderId matching the authenticated user. Pickup/handover, notes and delivery proofs use rider routes; browser customer screens redirect riders to their workspace.
- LAUNDRY_PARTNER: a linked LaundryPartner record determines assigned orders; intake, stages, quality check and notes use partner routes.
- ADMIN: ORDERS gates administrative order actions; OPERATIONS gates slots, staff operations, service areas, issues and payouts; CUSTOMERS gates customer data and deletion review; PROMOTIONS gates coupons; REPORTS gates reports; SETTINGS gates catalogue and business settings; ADMIN_ACCESS gates security. An empty permission list is full administration under the current middleware. Some read endpoints use ADMIN without a scoped permission; reproduce actual backend behavior rather than assuming universal scoping.

Backend checks remain authoritative. Navigation hiding is convenience only. User IDs are returned as id in auth, while Mongo entities often use _id.

## Order workflow

ORDER_PLACED → PICKUP_ASSIGNED → RIDER_ON_THE_WAY → PICKED_UP → PROCESSING → READY → OUT_FOR_DELIVERY → DELIVERED; CANCELLED is an alternate terminal state. This describes the normal path, not a blanket permission to move between statuses. Individual route prerequisites govern transitions.

Booking validates active service area by six-digit pincode, active service, garments and server prices. EXPRESS is only available for enabled ironing; regular requires a pickup slot and express rejects pickupSlot. Backend computes minimum order, coupon, credit, delivery charge and GST. Slot reservation/order creation use MongoDB transactions; staging Mongo must support transactions. Cancellation releases reserved capacity and returns coupon/credit accounting as implemented on the server. Customer cancellation is allowed before physical pickup; delivered orders cannot be cancelled.

Handover records received and unexpected garments, stains, damage, care notes and photos. Pricing discrepancies can require a customer response before processing progresses. Partner intake checks quantities/bags; discrepancies require explanation and must be resolved before stages start. Quality checks use a dedicated action. READY is subject to processing prerequisites.

Delivery requires customer-generated OTP, unexpired code, failed-attempt limit, recipient name, count reconciliation, location coordinates or note, and full recorded collection for unpaid COD. Photo payloads are validated and uploaded through backend Cloudinary services. Do not auto-retry money or delivery mutations after ambiguous network errors.

## Authentication contracts

- POST /auth/register: name, email, phone, password; password at least eight characters with a letter and number. CUSTOMER only.
- POST /auth/login: email, password; returns session or requiresTwoFactor/challengeToken. Admin challenge expires after five minutes.
- POST /auth/2fa/verify-login: challengeToken, code; supports authenticator or unused recovery code.
- POST /auth/refresh: current web contract reads cookie; mobile adapter accepts refreshToken body only with X-DG-Client: mobile. Rotation/reuse detection remain unchanged.
- POST /auth/logout: revokes refresh credential; POST /auth/logout-all requires access bearer and revokes sessions plus increments sessionVersion.
- GET /auth/me: current user. PUT /auth/onboarding: monthlySpendBand, frustrations, wouldUsePriority, mostUsedService; empty body completes skipped onboarding.
- POST /auth/forgot-password/verify: registered email and phone, returns ten-minute resetToken. POST /auth/forgot-password/reset: resetToken, password; revokes all sessions. This existing pilot recovery proves knowledge of account details, not possession of a contact channel. Strengthening it is a separate backend change to review before public release.
- POST /auth/verification/request and /confirm: channel EMAIL or PHONE; confirm also code. Development delivery can return a developmentCode; mobile does not expose it.
- PUT /auth/change-password: currentPassword, newPassword; forces sign-in again. Profile phone changes clear phone verification.
- Admin 2FA setup/enable/disable/recovery-code management APIs exist; login verification is in this milestone, setup management is a later screen.

See endpoints.md for methods/paths and web-api-actions.md for page call sites. JSON errors usually use error, optionally code/detail/requestId; preserve HTTP status and show safe error text.

## Gaps and release gates

- Cookie refresh transport needs the staged adapter before native authentication works.
- Existing single-device logout revokes refresh tokens; current requireAuth checks sessionVersion, not individual AuthSession. A previously issued access token can remain valid until expiry after single-device logout. All-device logout/password changes invalidate access tokens through sessionVersion. Do not claim stronger individual revocation than implemented.
- No native push device registration/delivery was found in the notification routes. Add device records in the same Mongo database and reuse notification event/preference logic in a later phase.
- Native deep-link scheme is configured; authorized order destinations follow with order screens. HTTPS app-link/domain association remains deployment work.
- Photos use base64 JSON; individual limits and Express 3mb total both matter. Camera/compression/upload is a later phase.
- Payments web page is Coming Soon; do not claim a functioning payment gateway or invent refund settlement integration.
- No deployment URL, Expo project ID, Firebase push credentials or Play Console identity has been supplied. No deployment or APK has been produced.

## Phases and checks

1. Audit: route and action inventories, models/workflow review, permission matrix.
2. Foundation/auth: native theme, secure token storage, refresh coordination, login/register, admin second factor, survey onboarding, reset and contact verification, password change, logout and live read-only role dashboard shells.
3. Customer: booking/history/tracking/revision/cancellation/support, retention, invoices and ratings.
4. Rider: pickup/handover/photos, manifest, OTP/COD/location proof.
5. Partner: intake/stages/quality checks, discrepancies and notes.
6. Admin: all implemented operations and scoped actions, reports, payouts and audit.
7. Native integrations/release: push, deep links, photos/files, Sentry, preview APK then Play testing/production.

Per-phase integration testing uses staging fixtures for each role, unauthorized/forbidden access checks, web/mobile parity and concurrency cases. Physical Android workflow testing and iOS compatibility testing are release requirements. No success is inferred from bundling alone.
