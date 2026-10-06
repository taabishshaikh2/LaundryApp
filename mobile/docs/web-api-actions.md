# Web action to API mapping

Literal API calls from pages and components. Dynamic endpoints, API query parameters and payloads require the referenced source.

## Account.jsx

- `PUT "/auth/profile", form)`

## AdminCustomers.jsx

- `GET "/admin/customers")`

## AdminDashboard.jsx

- `GET "/admin/summary")`

## AdminGrowth.jsx

- `GET "/growth/admin/areas"), api.get("/growth/admin/coupons")])`
- `POST "/growth/admin/areas", area)`
- `PUT '/growth/admin/areas/${row._id}', { ...row, active: !row.active })`
- `POST "/growth/admin/coupons", coupon)`
- `PUT '/growth/admin/coupons/${row._id}', { active: !row.active })`

## AdminIssues.jsx

- `GET "/issues/admin", { params }), api.get("/issues/admin/owners")])`
- `PUT '/issues/admin/${issue._id}', draft(issue))`
- `POST '/issues/${issue._id}/replies', { text, visibility })`

## AdminLaundryPartners.jsx

- `GET "/admin/laundry-partners")`
- `PUT '/admin/laundry-partners/${p._id}', { active: !p.active })`
- `DELETE '/admin/laundry-partners/${p._id}')`
- `POST "/admin/laundry-partners", form)`
- `PUT '/admin/laundry-partners/${editingId}', editForm)`

## AdminNotifications.jsx

- `GET "/admin/notifications").then((res) => setNotifications(res.data.notifications))`

## AdminOperations.jsx

- `GET "/operations/admin/overview"), api.get("/orders/admin/all"), api.get("/admin/slots")])`
- `GET "/operations/manifest", { params: { date } })`
- `POST "/operations/admin/payouts", payout)`
- `PUT '/operations/admin/payouts/${id}', { status, paymentReference })`
- `PUT '/operations/admin/orders/${schedule.orderId}/delivery-slot', { slotId: schedule.slotId })`
- `PUT '/operations/admin/deletion-requests/${id}', { status, reviewNote })`

## AdminOrders.jsx

- `GET "/orders/admin/all"), api.get("/admin/riders"), api.get("/admin/laundry-partners")])`
- `PUT '/orders/admin/${order._id}/status', { status })`
- `PUT '/orders/admin/${orderId}/${path}', body)`

## AdminPricing.jsx

- `GET "/admin/garments")`
- `PUT '/admin/garments/${id}', {`
- `PUT '/admin/garments/${g._id}', { active: !g.active })`
- `DELETE '/admin/garments/${g._id}')`
- `POST "/admin/garments", {`

## AdminReports.jsx

- `GET "/admin/reports", { params: Object.fromEntries(Object.entries(activeFilters).filter(([, value]) => value !== "")) })`
- `GET "/admin/report-options"), api.get("/admin/reports", { params: { from: filters.from, to: filters.to } })]).then(([optionResponse, reportResponse]) => { setOptions(optionResponse.data)`

## AdminRiders.jsx

- `GET "/admin/riders")`
- `POST "/admin/riders", form)`
- `PUT '/admin/riders/${editingId}', editForm)`

## AdminSecurity.jsx

- `GET "/admin/security")`
- `PUT '/admin/security/admins/${admin._id}/permissions', { permissions: next })`
- `POST "/auth/2fa/setup")`
- `POST '/auth/2fa/${action}', { code: twoFactor.code })`
- `POST "/auth/2fa/recovery-codes", { code: twoFactor.code })`
- `PUT '/admin/security/users/${account._id}/role', payload)`

## AdminServices.jsx

- `GET "/admin/services")`
- `PUT '/admin/services/${s._id}', { active: !s.active })`
- `DELETE '/admin/services/${s._id}')`
- `POST "/admin/services", form)`

## AdminSettings.jsx

- `GET "/admin/settings")`
- `PUT "/admin/settings", {`

## AdminSlots.jsx

- `GET "/admin/slots"), api.get("/admin/settings")])`
- `POST "/admin/slots", {`

## ForgotPassword.jsx

- `POST "/auth/forgot-password/verify", { email: form.email, phone: form.phone })`
- `POST "/auth/forgot-password/reset", { resetToken, password: form.password })`

## Home.jsx

- `GET "/orders"), api.get("/services")])`

## NewOrder.jsx

- `GET "/garments"), api.get("/services"), api.get("/config")])`
- `GET "/slots")`
- `GET "/growth/retention").then((response) => setReferralCredit(Number(response.data.referralCredit || 0))).catch(() => {})`
- `GET '/orders/${repeatId}').then(({ data }) => {`
- `GET '/growth/areas/${address.pincode}')`
- `POST "/growth/coupons/preview", { code: couponCode, subtotal })`
- `PUT "/growth/saved-garments", { items: items.map((item) => ({ garmentId: item._id, quantity: item.quantity })) })`
- `POST "/orders", {`

## Notifications.jsx

- `GET "/notifications"), api.get("/notifications/preferences")])`
- `PUT '/notifications/${item._id}/read')`
- `PUT "/notifications/read-all")`
- `PUT "/notifications/preferences", next)`

## Onboarding.jsx

- `PUT "/auth/onboarding", {})`
- `PUT "/auth/onboarding", {`

## OrderHistory.jsx

- `GET "/orders"), api.get("/issues/mine")])`

## OrderTracking.jsx

- `GET '/orders/${id}')`

## PartnerDashboard.jsx

- `GET "/partner/orders")`

## Profile.jsx

- `PUT "/auth/profile", formData)`

## RiderDashboard.jsx

- `GET "/rider/orders")`
- `GET "/operations/manifest", { params: { date: new Date().toISOString().slice(0, 10) } }).then(res => { setManifest(res.data.stops || [])`
- `PUT '/rider/orders/${orderId}/status', { status })`
- `POST '/rider/orders/${orderId}/notes', { text })`

## AppShell.jsx

- `GET "/notifications/unread-count").then((response) => setUnread(response.data.unreadCount)).catch(() => {})`

## CancellationRecord.jsx

- `POST '/orders/${order._id}/cancel', { reason })`
- `PUT '/orders/admin/${order._id}/status', { status: "CANCELLED", note: reason })`
- `PUT '/orders/admin/${order._id}/refund', form)`

## ContactVerification.jsx

- `POST "/auth/verification/request", { channel })`
- `POST "/auth/verification/confirm", { channel, code: codes[channel] })`

## DeliveryProof.jsx

- `POST '/orders/${order._id}/delivery-otp')`
- `POST '/rider/orders/${order._id}/delivery-proof', form)`

## HandoverRecord.jsx

- `PUT endpoint, { items, generalNotes })`

## IssueCenter.jsx

- `GET "/issues/mine")`
- `POST "/issues", { orderId: order._id, ...form })`
- `POST '/issues/${issueId}/replies', { text })`

## OrderDocuments.jsx

- `GET path, { responseType: "blob" })`
- `GET '/operations/orders/${order._id}/rating').then(response => { if (response.data.rating) { setRating(response.data.rating)`
- `POST '/operations/orders/${order._id}/rating', form)`

## PasswordChange.jsx

- `PUT "/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword })`

## PricingRevision.jsx

- `POST '/orders/admin/${order._id}/pricing-revision', { lines, note })`
- `POST '/orders/${order._id}/pricing-revision/respond', { response, note })`

## PrivacyPanel.jsx

- `GET "/operations/privacy/export", { responseType: "blob" })`
- `POST "/operations/privacy/delete-request", { reason })`

## ProcessingWorkflow.jsx

- `POST '/partner/orders/${order._id}/${path}', body)`
- `PUT '/partner/orders/${order._id}/status', { status: "READY" })`

## RetentionPanel.jsx

- `GET "/growth/retention").then((response) => setData(response.data)).catch(() => {})`
- `POST "/growth/referral/apply", { code })`

## RoleLayout.jsx

- `GET "/notifications/unread-count").then((response) => setUnread(response.data.unreadCount)).catch(() => {})`
