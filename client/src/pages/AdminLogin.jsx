import AuthLayout from "../components/AuthLayout";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function AdminLogin() {
  const {
    login,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== "ADMIN") {
        logout();
        setError("This login is for admin accounts only.");
        return;
      }
      navigate("/admin");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }
  return <AuthLayout title="Your workspace awaits." description="Sign in with your admin account to manage daily operations.">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-2xl p-6">
        <div>
          <label htmlFor="admin-email" className="text-sm font-medium">Admin email</label>
          <input id="admin-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2" placeholder="admin@dhobighat.com" />
        </div>
        <div>
          <label htmlFor="admin-password" className="text-sm font-medium">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full mt-1 border rounded-lg px-3 py-2" />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white rounded-lg py-3 font-semibold disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in to admin panel →"}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Not an admin? <Link to="/login" className="text-brand-600 font-medium">Customer sign in</Link>
      </p>
    </AuthLayout>;
}
