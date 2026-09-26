import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "RIDER") navigate("/rider");
      else if (user.role === "LAUNDRY_PARTNER") navigate("/partner");
      else navigate(user.onboarding?.completed ? "/" : "/onboarding");
    } catch (err) {
      showError(err?.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-5xl mb-3">🧺</div>
          <h1 className="text-heading-1 text-brand-700 mb-2">Dhobi Ghat</h1>
          <p className="text-gray-600">Sign in to book your next wash</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
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
      </div>
    </div>
  );
}
