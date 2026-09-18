import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const loginPath = adminOnly ? "/admin/login" : "/login";

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" replace />;
  if (!adminOnly && !user.onboarding?.completed) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
