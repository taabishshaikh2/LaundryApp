import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../context/AuthContext";

const permissions = ["ORDERS", "OPERATIONS", "CUSTOMERS", "PROMOTIONS", "REPORTS", "SETTINGS", "ADMIN_ACCESS"];
export default function AdminSecurity() {
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState({ admins: [], users: [], auditLogs: [], retentionDays: 365 }); const [error, setError] = useState(""); const [twoFactor, setTwoFactor] = useState({ secret: "", code: "" }); const [changingRole, setChangingRole] = useState("");
  async function load() { const response = await api.get("/admin/security"); setData(response.data); }
  useEffect(() => { load().catch(err => setError(err.response?.data?.error || "Could not load security controls")); }, []);
  async function toggle(admin, permission) { const current = admin.adminPermissions?.length ? admin.adminPermissions : permissions; const next = current.includes(permission) ? current.filter(item => item !== permission) : [...current, permission]; try { await api.put(`/admin/security/admins/${admin._id}/permissions`, { permissions: next }); await load(); } catch (err) { setError(err.response?.data?.error || "Could not update permissions"); } }
  async function beginTwoFactor() { try { const response = await api.post("/auth/2fa/setup"); setTwoFactor({ secret: response.data.secret, code: "" }); } catch (err) { setError(err.response?.data?.error || "Could not start two-factor setup"); } }
  async function confirmTwoFactor(action) { try { await api.post(`/auth/2fa/${action}`, { code: twoFactor.code }); setTwoFactor({ secret: "", code: "" }); await refreshUser(); } catch (err) { setError(err.response?.data?.error || "Invalid authenticator code"); } }
  async function changeRole(account, role) {
    if (role === account.role) return;
    const payload = { role };
    if (role === "LAUNDRY_PARTNER") {
      const businessName = window.prompt("Laundry business name", `${account.name} Laundry`);
      if (!businessName) return;
      payload.businessName = businessName;
      payload.address = window.prompt("Laundry business address (optional)", "") || "";
    }
    setChangingRole(account._id); setError("");
    try { await api.put(`/admin/security/users/${account._id}/role`, payload); await load(); }
    catch (err) { setError(err.response?.data?.error || "Could not change account role"); }
    finally { setChangingRole(""); }
  }
  return <AdminLayout title="Security & audit"><div className="dg-security">
    <section className="dg-card"><p className="dg-eyebrow">TWO-FACTOR AUTHENTICATION</p><h2>Protect your admin login</h2><p className="dg-muted">Status: <strong>{user?.twoFactorEnabled ? "Enabled" : "Not enabled"}</strong></p>{!user?.twoFactorEnabled && !twoFactor.secret && <button className="dg-button mt-4" onClick={beginTwoFactor}>Set up authenticator</button>}{twoFactor.secret && <div className="dg-two-factor"><p>Add this key to Google Authenticator, Microsoft Authenticator, or Authy:</p><code>{twoFactor.secret}</code><label>Current 6-digit code<input inputMode="numeric" value={twoFactor.code} onChange={e => setTwoFactor({ ...twoFactor, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></label><button className="dg-button" onClick={() => confirmTwoFactor("enable")}>Enable two-factor authentication</button></div>}{user?.twoFactorEnabled && <div className="dg-inline-form mt-4"><input aria-label="Authenticator code" inputMode="numeric" placeholder="6-digit code" value={twoFactor.code} onChange={e => setTwoFactor({ ...twoFactor, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} /><button className="dg-button dg-secondary" onClick={() => confirmTwoFactor("disable")}>Disable 2FA</button></div>}</section>
    <section className="dg-card"><p className="dg-eyebrow">ACCOUNT ROLES</p><h2>Assign workspace access</h2><p className="dg-muted mb-4">Public signup always creates a customer account. Only an administrator with Admin Access can assign rider, laundry partner, or admin access.</p><p className="dg-table-hint">Swipe sideways to see all accounts.</p><div className="dg-table-scroll"><table><thead><tr><th>User</th><th>Email</th><th>Current role</th><th>Assign role</th></tr></thead><tbody>{data.users.map(account => <tr key={account._id}><td>{account.name}{String(account._id) === String(user?.id) && <small> · You</small>}</td><td>{account.email}</td><td>{account.role.replaceAll("_", " ")}</td><td><select aria-label={`Role for ${account.name}`} value={account.role} disabled={String(account._id) === String(user?.id) || changingRole === account._id} onChange={event => changeRole(account, event.target.value)}><option value="CUSTOMER">Customer</option><option value="RIDER">Rider</option><option value="LAUNDRY_PARTNER">Laundry partner</option><option value="ADMIN">Admin</option></select></td></tr>)}</tbody></table></div></section>
    <section className="dg-card"><p className="dg-eyebrow">ADMIN ACCESS</p><h2>Permission controls</h2><p className="dg-muted mb-4">Admins with no selected permissions are legacy full administrators. Select permissions to scope an account.</p>{data.admins.map(admin => <article className="dg-admin-permissions" key={admin._id}><div><strong>{admin.name}</strong><p>{admin.email}</p></div><div className="dg-permission-grid">{permissions.map(permission => <label key={permission}><input type="checkbox" checked={(admin.adminPermissions?.length ? admin.adminPermissions : permissions).includes(permission)} onChange={() => toggle(admin, permission)} /> {permission.replaceAll("_", " ")}</label>)}</div></article>)}</section>
    <section className="dg-card"><p className="dg-eyebrow">AUDIT LOG</p><h2>Recent sensitive changes</h2><p className="dg-muted mb-4">Records automatically expire after {data.retentionDays} days.</p><p className="dg-table-hint">Swipe sideways to see all audit details.</p><div className="dg-table-scroll"><table><thead><tr><th>Time</th><th>Admin</th><th>Action</th><th>Record</th><th>IP</th></tr></thead><tbody>{data.auditLogs.map(row => <tr key={row._id}><td>{new Date(row.createdAt).toLocaleString("en-IN")}</td><td>{row.actorId?.name || row.actorRole}</td><td>{row.action.replaceAll("_", " ")}</td><td>{row.entityType} {row.entityId}</td><td>{row.ip || "—"}</td></tr>)}</tbody></table></div></section>{error && <p className="dg-error">{error}</p>}
  </div></AdminLayout>;
}
