# API inventory

Generated from route declarations. Inspect route source for payload validation and ownership checks; middleware can be inherited. Settings and admin slots also have legacy /admin aliases. Health and readiness are public GET /api/health and /api/ready.

## /api/auth

Source: server/src/routes/auth.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| POST | /api/auth/register | authLimiter, |
| POST | /api/auth/login | authLimiter, |
| POST | /api/auth/forgot-password/verify | resetLimiter, |
| POST | /api/auth/forgot-password/reset | Inherited / handler checks |
| GET | /api/auth/me | requireAuth, |
| PUT | /api/auth/profile | requireAuth, |
| PUT | /api/auth/change-password | requireAuth, |
| POST | /api/auth/refresh | rateLimit({ namespace: "refresh", max: 30, windowMs: 15 * 60 * 1000 }), |
| POST | /api/auth/logout | Inherited / handler checks |
| POST | /api/auth/logout-all | requireAuth, |
| POST | /api/auth/2fa/verify-login | rateLimit({ namespace: "2fa-login", max: 8, windowMs: 15 * 60 * 1000 }), |
| POST | /api/auth/2fa/setup | requireAuth, |
| POST | /api/auth/2fa/enable | requireAuth, |
| POST | /api/auth/2fa/disable | requireAuth, |
| POST | /api/auth/2fa/recovery-codes | requireAuth, |
| PUT | /api/auth/onboarding | requireAuth, |
| PUT | /api/auth/address | requireAuth, |
| POST | /api/auth/verification/request | requireAuth, rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }), |
| POST | /api/auth/verification/confirm | requireAuth, rateLimit({ max: 8, windowMs: 15 * 60 * 1000 }), |

## /api/garments

Source: server/src/routes/garments.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/garments | Inherited / handler checks |

## /api/services

Source: server/src/routes/services.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/services | Inherited / handler checks |

## /api/orders

Source: server/src/routes/orders.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| POST | /api/orders | requireAuth, |
| GET | /api/orders | requireAuth, |
| POST | /api/orders/:id/cancel | requireAuth, |
| POST | /api/orders/:id/pricing-revision/respond | requireAuth, |
| GET | /api/orders/:id | requireAuth, |
| POST | /api/orders/:id/delivery-otp | requireAuth, |
| GET | /api/orders/admin/all | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/status | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/handover | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/refund | requireAuth, requirePermission("ORDERS"), |
| POST | /api/orders/admin/:id/pricing-revision | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/assign-rider | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/assign-partner | requireAuth, requirePermission("ORDERS"), |
| PUT | /api/orders/admin/:id/assign | requireAuth, requirePermission("ORDERS"), |

## /api/admin

Source: server/src/routes/admin.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/admin/summary | Inherited / handler checks |
| GET | /api/admin/report-options | Inherited / handler checks |
| GET | /api/admin/reports | Inherited / handler checks |
| GET | /api/admin/security | requirePermission("ADMIN_ACCESS"), |
| PUT | /api/admin/security/admins/:id/permissions | requirePermission("ADMIN_ACCESS"), |
| PUT | /api/admin/security/users/:id/role | requirePermission("ADMIN_ACCESS"), |
| GET | /api/admin/customers | Inherited / handler checks |
| GET | /api/admin/riders | Inherited / handler checks |
| POST | /api/admin/riders | Inherited / handler checks |
| PUT | /api/admin/riders/:id | Inherited / handler checks |
| GET | /api/admin/garments | Inherited / handler checks |
| POST | /api/admin/garments | Inherited / handler checks |
| PUT | /api/admin/garments/:id | Inherited / handler checks |
| DELETE | /api/admin/garments/:id | Inherited / handler checks |
| GET | /api/admin/services | Inherited / handler checks |
| POST | /api/admin/services | Inherited / handler checks |
| PUT | /api/admin/services/:id | Inherited / handler checks |
| DELETE | /api/admin/services/:id | Inherited / handler checks |
| GET | /api/admin/laundry-partners | Inherited / handler checks |
| POST | /api/admin/laundry-partners | Inherited / handler checks |
| PUT | /api/admin/laundry-partners/:id | Inherited / handler checks |
| DELETE | /api/admin/laundry-partners/:id | Inherited / handler checks |
| GET | /api/admin/notifications | Inherited / handler checks |

Inherited middleware: `requireAuth, requireAdmin);`, `(req, res, next) => {`

## /api/rider

Source: server/src/routes/rider.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/rider/orders | Inherited / handler checks |
| GET | /api/rider/orders/:id | Inherited / handler checks |
| PUT | /api/rider/orders/:id/status | Inherited / handler checks |
| POST | /api/rider/orders/:id/delivery-proof | Inherited / handler checks |
| PUT | /api/rider/orders/:id/handover | Inherited / handler checks |
| POST | /api/rider/orders/:id/notes | Inherited / handler checks |

Inherited middleware: `requireAuth, requireRole("RIDER"));`

## /api/partner

Source: server/src/routes/partner.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/partner/orders | Inherited / handler checks |
| POST | /api/partner/orders/:id/intake | Inherited / handler checks |
| POST | /api/partner/orders/:id/processing-stage | Inherited / handler checks |
| POST | /api/partner/orders/:id/quality-check | Inherited / handler checks |
| PUT | /api/partner/orders/:id/status | Inherited / handler checks |
| POST | /api/partner/orders/:id/notes | Inherited / handler checks |

Inherited middleware: `requireAuth, requireRole("LAUNDRY_PARTNER"));`

## /api/admin/settings

Source: server/src/routes/adminSettings.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/admin/settings | requireAuth, requirePermission("SETTINGS"), |
| PUT | /api/admin/settings | requireAuth, requirePermission("SETTINGS"), |

## /api/admin/slots

Source: server/src/routes/slots.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/admin/slots | requireAuth, requirePermission("OPERATIONS"), |
| POST | /api/admin/slots | requireAuth, requirePermission("OPERATIONS"), |
| PUT | /api/admin/slots/:id | requireAuth, requirePermission("OPERATIONS"), |
| DELETE | /api/admin/slots/:id | requireAuth, requirePermission("OPERATIONS"), |

## /api/slots

Source: server/src/routes/slotsPublic.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/slots | Inherited / handler checks |

## /api/config

Source: server/src/routes/publicSettings.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/config | Inherited / handler checks |

## /api/issues

Source: server/src/routes/issues.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/issues/admin/owners | requirePermission("OPERATIONS"), |
| GET | /api/issues/admin | requirePermission("OPERATIONS"), |
| GET | /api/issues/mine | Inherited / handler checks |
| POST | /api/issues | Inherited / handler checks |
| GET | /api/issues/:id | Inherited / handler checks |
| POST | /api/issues/:id/replies | Inherited / handler checks |
| PUT | /api/issues/admin/:id | requirePermission("OPERATIONS"), |

Inherited middleware: `requireAuth);`

## /api/notifications

Source: server/src/routes/notifications.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/notifications | Inherited / handler checks |
| GET | /api/notifications/unread-count | Inherited / handler checks |
| PUT | /api/notifications/read-all | Inherited / handler checks |
| PUT | /api/notifications/:id/read | Inherited / handler checks |
| GET | /api/notifications/preferences | Inherited / handler checks |
| PUT | /api/notifications/preferences | Inherited / handler checks |

Inherited middleware: `requireAuth);`

## /api/growth

Source: server/src/routes/growth.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/growth/areas | Inherited / handler checks |
| GET | /api/growth/areas/:pincode | Inherited / handler checks |
| POST | /api/growth/coupons/preview | requireAuth, |
| GET | /api/growth/retention | requireAuth, |
| PUT | /api/growth/saved-garments | requireAuth, |
| POST | /api/growth/referral/apply | requireAuth, |
| GET | /api/growth/admin/areas | requireAuth, requireAdmin, |
| POST | /api/growth/admin/areas | requireAuth, requirePermission("OPERATIONS"), |
| PUT | /api/growth/admin/areas/:id | requireAuth, requirePermission("OPERATIONS"), |
| GET | /api/growth/admin/coupons | requireAuth, requireAdmin, |
| POST | /api/growth/admin/coupons | requireAuth, requirePermission("PROMOTIONS"), |
| PUT | /api/growth/admin/coupons/:id | requireAuth, requirePermission("PROMOTIONS"), |

## /api/operations

Source: server/src/routes/operations.js

| Method | Endpoint | Declared middleware |
|---|---|---|
| GET | /api/operations/orders/:id/invoice | Inherited / handler checks |
| GET | /api/operations/orders/:id/label | Inherited / handler checks |
| GET | /api/operations/orders/:id/rating | Inherited / handler checks |
| POST | /api/operations/orders/:id/rating | Inherited / handler checks |
| GET | /api/operations/manifest | Inherited / handler checks |
| GET | /api/operations/admin/overview | requirePermission("OPERATIONS"), |
| POST | /api/operations/admin/payouts | requirePermission("OPERATIONS"), |
| PUT | /api/operations/admin/payouts/:id | requirePermission("OPERATIONS"), |
| PUT | /api/operations/admin/orders/:id/delivery-slot | requirePermission("OPERATIONS"), |
| GET | /api/operations/privacy/export | Inherited / handler checks |
| POST | /api/operations/privacy/delete-request | Inherited / handler checks |
| PUT | /api/operations/admin/deletion-requests/:id | requirePermission("CUSTOMERS"), |

Inherited middleware: `requireAuth);`
