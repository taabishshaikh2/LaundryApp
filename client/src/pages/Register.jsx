import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.phone, form.password);
      navigate("/onboarding");
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center">
      <h1 className="text-3xl font-bold text-brand-700 mb-1">Create account</h1>
      <p className="text-gray-500 mb-6">Book your first wash in minutes</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone</label>
          <input
            required
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-lg py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Register →"}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Already have an account? <Link to="/login" className="text-brand-600 font-medium">Sign in</Link>
      </p>
    </div>
  );
}
