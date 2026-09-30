import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("verify");
  const [form, setForm] = useState({ email: "", phone: "", password: "", confirmPassword: "" });
  const [resetToken, setResetToken] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function verify(event) {
    event.preventDefault(); setLoading(true); setError("");
    try { const response = await api.post("/auth/forgot-password/verify", { email: form.email, phone: form.phone }); setResetToken(response.data.resetToken); setStep("reset"); }
    catch (err) { setError(err.response?.data?.error || "Could not verify account"); }
    finally { setLoading(false); }
  }
  async function reset(event) {
    event.preventDefault(); setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match");
    setLoading(true);
    try { await api.post("/auth/forgot-password/reset", { resetToken, password: form.password }); navigate("/login", { replace: true, state: { passwordReset: true } }); }
    catch (err) { setError(err.response?.data?.error || "Could not reset password"); }
    finally { setLoading(false); }
  }
  return <AuthLayout title="Reset your password." description={step === "verify" ? "Verify the contact details already registered on your account." : "Choose a new password for your account."}>
    <div className="card-elevated p-6">
      {step === "verify" ? <form onSubmit={verify} className="dg-password-form"><label>Email<input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Registered phone number<input type="tel" required autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><small>Enter it exactly as saved on your account.</small></label>{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={loading}>{loading ? "Verifying…" : "Verify account"}</button></form> : <form onSubmit={reset} className="dg-password-form"><label>New password<input type="password" required minLength="8" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><label>Confirm new password<input type="password" required minLength="8" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={loading}>{loading ? "Resetting…" : "Reset password"}</button></form>}
      <p className="text-sm text-center mt-5"><Link to="/login" className="underline">Back to sign in</Link></p>
    </div>
  </AuthLayout>;
}
