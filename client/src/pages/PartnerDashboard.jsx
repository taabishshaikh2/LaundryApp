import React, { useEffect, useState } from "react";
import api from "../api";
import RoleLayout from "../components/RoleLayout";
import { PartnerProcessingControls, ProcessingTimeline } from "../components/ProcessingWorkflow";

export default function PartnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  async function load() { try { const response = await api.get("/partner/orders"); setOrders(response.data.orders); setError(""); } catch { setError("Could not load assigned orders. Please try again."); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const processing = orders.filter((order) => order.status === "PROCESSING");
  const others = orders.filter((order) => order.status !== "PROCESSING");
  return <RoleLayout title="Laundry Partner" subtitle="Intake, processing, quality, and packing">
    {error && <div className="dg-error" role="alert">{error} <button onClick={load} className="underline">Retry</button></div>}
    {loading && <p role="status" className="dg-empty">Loading assignments…</p>}
    <div className="dg-section-heading"><h2>Processing ({processing.length})</h2></div>
    <div className="space-y-4">{processing.map((order) => {
      const open = expandedId === order._id;
      const received = (order.handover?.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
      const overdue = order.processing?.dueAt && new Date(order.processing.dueAt) < new Date();
      return <article key={order._id} className="dg-card dg-partner-order">
        <div className="dg-order-head"><div><p className="dg-eyebrow">ORDER #{order._id.slice(-6).toUpperCase()}</p><h2>{order.userId?.name}</h2><p className="dg-muted">{order.serviceName} · {received} received garment(s)</p></div><div className="text-right"><span className={`dg-status ${overdue ? "is-overdue" : ""}`}>{overdue ? "DELAYED" : "PROCESSING"}</span>{order.userId?.phone && <a className="block text-sm mt-2" href={`tel:${order.userId.phone}`}>Call customer</a>}</div></div>
        <div className="mt-4"><ProcessingTimeline order={order} showAudit={false} /></div>
        <button className="dg-button mt-4" onClick={() => setExpandedId(open ? null : order._id)}>{open ? "Close work panel" : "Continue processing"}</button>
        {open && <div className="dg-partner-work-panel"><PartnerProcessingControls order={order} onSaved={load} /></div>}
      </article>;
    })}{!loading && !processing.length && <p className="dg-empty">Nothing is waiting to be processed.</p>}</div>
    {!!others.length && <><div className="dg-section-heading"><h2>Other assigned orders</h2></div><div className="space-y-2">{others.map((order) => <div key={order._id} className="dg-card flex justify-between gap-3"><span>#{order._id.slice(-6).toUpperCase()} · {order.userId?.name}</span><span className="dg-status">{order.status.replaceAll("_", " ")}</span></div>)}</div></>}
  </RoleLayout>;
}
