import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import RoleLayout from "../components/RoleLayout";
import Card from "../components/ui/Card";
import PasswordChange from "../components/PasswordChange";

export default function Account() {
  const { user, refreshUser } = useAuth(); const { showSuccess, showError } = useToast();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" }); const [saving, setSaving] = useState(false);
  async function save(event) { event.preventDefault(); setSaving(true); try { await api.put("/auth/profile", form); await refreshUser(); showSuccess("Account information updated"); } catch (err) { showError(err.response?.data?.error || "Could not update account"); } finally { setSaving(false); } }
  const content = <div className="dg-account-grid"><Card padding="lg"><form onSubmit={save} className="dg-password-form"><h3>Account information</h3><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input value={user?.email || ""} disabled /></label><label>Phone<input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><button className="dg-button" disabled={saving}>{saving ? "Saving…" : "Save information"}</button></form></Card><Card padding="lg"><PasswordChange /></Card></div>;
  if (user?.role === "ADMIN") return <AdminLayout title="My account">{content}</AdminLayout>;
  return <RoleLayout title="My account" subtitle="Personal information and password">{content}</RoleLayout>;
}
