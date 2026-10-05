import React, { useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function PasswordChange() {
  const { logout } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError(""); setMessage("");
    if (form.newPassword !== form.confirmPassword) return setError("New passwords do not match");
    setSaving(true);
    try { await api.put("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage("Password changed. Sign in again on all devices."); await logout(); navigate("/login", { replace: true, state: { passwordReset: true } }); }
    catch (err) { setError(err.response?.data?.error || "Could not change password"); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="dg-password-form">
    <h3>Change password</h3><p className="dg-muted text-sm">Use at least 8 characters.</p>
    <label>Current password<input type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></label>
    <label>New password<input type="password" autoComplete="new-password" minLength="8" required value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></label>
    <label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
    {error && <div className="dg-error">{error}</div>}{message && <div className="dg-success">{message}</div>}
    <button className="dg-button" disabled={saving}>{saving ? "Changing…" : "Change password"}</button>
  </form>;
}
