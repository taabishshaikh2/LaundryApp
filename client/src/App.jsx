import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import NewOrder from "./pages/NewOrder";
import OrderTracking from "./pages/OrderTracking";
import OrderHistory from "./pages/OrderHistory";
import Profile from "./pages/Profile";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminCustomers from "./pages/AdminCustomers";
import AdminRiders from "./pages/AdminRiders";
import AdminPricing from "./pages/AdminPricing";
import AdminServices from "./pages/AdminServices";
import AdminLaundryPartners from "./pages/AdminLaundryPartners";
import AdminComingSoon from "./pages/AdminComingSoon";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/onboarding"
          element={
            <RequireAuthOnly>
              <Onboarding />
            </RequireAuthOnly>
          }
        />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/new-order" element={<ProtectedRoute><NewOrder /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
        <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute adminOnly><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/customers" element={<ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute>} />
        <Route path="/admin/riders" element={<ProtectedRoute adminOnly><AdminRiders /></ProtectedRoute>} />
        <Route path="/admin/pricing" element={<ProtectedRoute adminOnly><AdminPricing /></ProtectedRoute>} />
        <Route path="/admin/services" element={<ProtectedRoute adminOnly><AdminServices /></ProtectedRoute>} />
        <Route path="/admin/laundry-partners" element={<ProtectedRoute adminOnly><AdminLaundryPartners /></ProtectedRoute>} />
        <Route
          path="/admin/slots"
          element={
            <ProtectedRoute adminOnly>
              <AdminComingSoon title="Pickup / Delivery Slots" description="Manage available time slots and capacity." />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute adminOnly>
              <AdminComingSoon title="Payments" description="View Razorpay payment records once payments are wired in." />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute adminOnly>
              <AdminComingSoon title="Notifications log" description="See WhatsApp messages sent per order once integrated." />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/issues"
          element={
            <ProtectedRoute adminOnly>
              <AdminComingSoon title="Issues / Notes" description="Track complaints, damages, and internal notes per order." />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute adminOnly>
              <AdminComingSoon title="Settings" description="Business settings, GST rate, priority multiplier, and more." />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

// Onboarding needs auth but must NOT redirect back into itself
function RequireAuthOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
