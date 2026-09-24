import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
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
      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "RIDER") navigate("/rider");
      else if (user.role === "LAUNDRY_PARTNER") navigate("/partner");
      else navigate(user.onboarding?.completed ? "/" : "/onboarding");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center">
      <h1 className="text-3xl font-bold text-brand-700 mb-1">Dhobi Ghat</h1>
      <p className="text-gray-500 mb-6">Sign in to book your next wash</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in →"}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-6 text-center">
        New here? <Link to="/register" className="text-brand-600 font-medium">Register</Link>
      </p>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Are you an admin? <Link to="/admin/login" className="underline">Sign in here</Link>
      </p>
    </div>
  );
}
