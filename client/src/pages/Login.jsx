import AuthLayout from "../components/AuthLayout";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
export default function Login() {
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    showError
  } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "ADMIN") navigate("/admin");else if (user.role === "RIDER") navigate("/rider");else if (user.role === "LAUNDRY_PARTNER") navigate("/partner");else navigate(user.onboarding?.completed ? "/" : "/onboarding");
    } catch (err) {
      showError(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return <AuthLayout title="Welcome back." description="Sign in to book a pickup and follow your orders.">
        <div className="card-elevated p-6 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />

            <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
            <div className="text-right"><Link to="/forgot-password" className="text-sm text-brand-600 underline">Forgot password?</Link></div>

            {location.state?.passwordReset && <div className="dg-success">Password reset successfully. Sign in with your new password.</div>}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in →"}
            </Button>
          </form>

          <p className="text-sm text-gray-600 mt-6 text-center">
            New here?{" "}
            <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Admin?{" "}
          <Link to="/admin/login" className="text-brand-600 hover:text-brand-700 underline">
            Sign in here
          </Link>
        </p>
    </AuthLayout>;
}
