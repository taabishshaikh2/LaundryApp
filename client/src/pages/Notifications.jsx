import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import AdminLayout from "../components/AdminLayout";
import RoleLayout from "../components/RoleLayout";

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]); const [unread, setUnread] = useState(0); const [preferences, setPreferences] = useState({}); const [loading, setLoading] = useState(true);
  async function load() { const [inbox, prefs] = await Promise.all([api.get("/notifications"), api.get("/notifications/preferences")]); setItems(inbox.data.notifications); setUnread(inbox.data.unreadCount); setPreferences(prefs.data.preferences); setLoading(false); }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  async function read(item) { if (!item.readAt) { await api.put(`/notifications/${item._id}/read`); setUnread((n) => Math.max(0, n - 1)); setItems((list) => list.map((row) => row._id === item._id ? { ...row, readAt: new Date().toISOString() } : row)); } }
  async function markAll() { await api.put("/notifications/read-all"); setUnread(0); setItems((list) => list.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() }))); }
  async function toggle(key) { const next = { ...preferences, [key]: !preferences[key] }; setPreferences(next); await api.put("/notifications/preferences", next); }
  const visiblePreferences = [["orderUpdates", "Customer order updates"], ["riderAssignments", "Rider assignments"], ["promotions", "Offers and promotions"], ["adminAlerts", "Admin alerts"], ["emailAlerts", "Email delivery"], ["whatsAppAlerts", "WhatsApp delivery"]].filter(([key]) => user?.role === "ADMIN" ? ["adminAlerts", "emailAlerts", "whatsAppAlerts"].includes(key) : user?.role === "RIDER" ? key === "riderAssignments" : !["adminAlerts", "riderAssignments"].includes(key));
  const content = <div className="dg-notification-page"><section className="dg-card"><div className="dg-section-heading"><div><h2>Inbox</h2><p className="dg-muted">{unread} unread notification{unread === 1 ? "" : "s"}</p></div>{unread > 0 && <button className="dg-button dg-secondary" onClick={markAll}>Mark all read</button>}</div>{loading ? <p className="dg-empty">Loading notifications…</p> : !items.length ? <p className="dg-empty">You are all caught up.</p> : <div className="dg-notification-list">{items.map((item) => <article key={item._id} className={item.readAt ? "" : "is-unread"}><div><strong>{item.title || "Update"}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString("en-IN")}</small></div>{item.actionUrl ? <Link className="dg-button dg-secondary" to={item.actionUrl} onClick={() => read(item)}>Open</Link> : !item.readAt && <button className="dg-button dg-secondary" onClick={() => read(item)}>Mark read</button>}</article>)}</div>}</section><section className="dg-card"><p className="dg-eyebrow">PREFERENCES</p><h2 className="text-heading-3 mb-4">Choose what appears here</h2>{visiblePreferences.map(([key, label]) => <label className="dg-preference" key={key}><span>{label}</span><input type="checkbox" checked={preferences[key] !== false} onChange={() => toggle(key)} /></label>)}</section></div>;
  if (user?.role === "ADMIN") return <AdminLayout title="Alerts">{content}</AdminLayout>;
  if (["RIDER", "LAUNDRY_PARTNER"].includes(user?.role)) return <RoleLayout title="Notifications" subtitle="Assignments and operational updates">{content}</RoleLayout>;
  return <Layout title="Notifications">{content}</Layout>;
}
