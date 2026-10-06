# Web screen inventory

Source: client/src/App.jsx. Screen availability does not imply API permission.

| Route | Screen | Web guard |
|---|---|---|
| /login | Login | Public / redirect |
| /register | Register | Public / redirect |
| /admin/login | AdminLogin | Public / redirect |
| /forgot-password | ForgotPassword | Public / redirect |
| /onboarding | Onboarding | Authenticated |
| / | Home | CUSTOMER / ADMIN |
| /new-order | NewOrder | CUSTOMER / ADMIN |
| /orders | OrderHistory | CUSTOMER / ADMIN |
| /orders/:id | OrderTracking | CUSTOMER / ADMIN |
| /profile | Profile | CUSTOMER / ADMIN |
| /notifications | Notifications | CUSTOMER / ADMIN |
| /rider | RiderDashboard | "RIDER" |
| /partner | PartnerDashboard | "LAUNDRY_PARTNER" |
| /account | Account | "RIDER", "LAUNDRY_PARTNER", "ADMIN" |
| /admin | AdminDashboard | ADMIN |
| /admin/orders | AdminOrders | ADMIN |
| /admin/reports | AdminReports | ADMIN |
| /admin/growth | AdminGrowth | ADMIN |
| /admin/alerts | Notifications | ADMIN |
| /admin/security | AdminSecurity | ADMIN |
| /admin/operations | AdminOperations | ADMIN |
| /admin/customers | AdminCustomers | ADMIN |
| /admin/riders | AdminRiders | ADMIN |
| /admin/pricing | AdminPricing | ADMIN |
| /admin/services | AdminServices | ADMIN |
| /admin/laundry-partners | AdminLaundryPartners | ADMIN |
| /admin/slots | AdminSlots | ADMIN |
| /admin/payments | AdminComingSoon | ADMIN |
| /admin/notifications | AdminNotifications | ADMIN |
| /admin/issues | AdminIssues | ADMIN |
| /admin/settings | AdminSettings | ADMIN |
| * | See App.jsx | Public / redirect |