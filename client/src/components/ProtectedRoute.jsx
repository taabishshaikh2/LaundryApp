import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  ADMIN: "/admin",
  RIDER: "/rider",
  LAUNDRY_PARTNER: "/partner",
  CUSTOMER: "/",
};

// Default (no roles/adminOnly passed) = customer-app routes: open to
// CUSTOMER and ADMIN (admin has a "customer view" link), but NOT riders
// or laundry partners, who get bounced to their own dashboard instead.
export function ProtectedRoute({ children, adminOnly = false, roles }) {
  const { user, loading } = useAuth();
  const requiredRoles = roles || (adminOnly ? ["ADMIN"] : ["CUSTOMER", "ADMIN"]);
  const loginPath = requiredRoles.length === 1 && requiredRoles[0] === "ADMIN" ? "/admin/login" : "/login";

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!user) return <Navigate to={loginPath} replace />;

  if (!requiredRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role] || "/"} replace />;
  }

  if (user.role === "CUSTOMER" && !user.onboarding?.completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
