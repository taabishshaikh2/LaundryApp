import React, { useEffect, useState } from "react";
import api from "../api";
import RoleLayout from "../components/RoleLayout";
import { HandoverDetails, HandoverEditor } from "../components/HandoverRecord";
import { DeliveryProofDetails, RiderDeliveryForm } from "../components/DeliveryProof";

const NEXT_ACTION = {
  PICKUP_ASSIGNED: { status: "RIDER_ON_THE_WAY", label: "Start pickup journey" },
  READY: { status: "OUT_FOR_DELIVERY", label: "Start delivery" },
};
const WAITING_TEXT = { PICKED_UP: "Pickup recorded. Waiting for processing…", PROCESSING: "Being processed by the laundry partner…" };

export default function RiderDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  async function load() { try { const res = await api.get("/rider/orders"); setOrders(res.data.orders); setError(""); } catch { setError("Could not load assigned orders. Please try again."); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function advance(orderId, status) { setUpdatingId(orderId); try { await api.put(`/rider/orders/${orderId}/status`, { status }); await load(); } catch (err) { setError(err.response?.data?.error || "Could not update this order."); } finally { setUpdatingId(null); } }
  async function submitNote(orderId) { try { const text = (noteDrafts[orderId] || "").trim(); if (!text) return; await api.post(`/rider/orders/${orderId}/notes`, { text }); setNoteDrafts((drafts) => ({ ...drafts, [orderId]: "" })); await load(); } catch { setError("Could not save your note."); } }
  const activeOrders = orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
  const pastOrders = orders.filter((order) => ["DELIVERED", "CANCELLED"].includes(order.status));
  function renderOrder(order) {
    const action = NEXT_ACTION[order.status];
    const canRecordPickup = ["PICKUP_ASSIGNED", "RIDER_ON_THE_WAY"].includes(order.status);
    const isOpen = expandedId === order._id;
    return <article key={order._id} className="dg-card dg-rider-order">
      <div className="flex justify-between gap-4"><div><p className="font-semibold">#{order._id.slice(-6).toUpperCase()} · {order.userId?.name}</p><p className="text-sm dg-muted">{order.address?.line1}{order.address?.landmark ? `, ${order.address.landmark}` : ""}</p></div>{order.userId?.phone && <a href={`tel:${order.userId.phone}`} className="dg-button dg-secondary">Call</a>}</div>
      <div className="flex flex-wrap gap-2 items-center my-3"><span className="dg-status">{order.status.replaceAll("_", " ")}</span><span className="text-xs dg-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)} garments ordered</span></div>
      {action && <button disabled={updatingId === order._id} onClick={() => advance(order._id, action.status)} className="dg-button">{updatingId === order._id ? "Updating…" : action.label}</button>}
      {WAITING_TEXT[order.status] && <p className="text-sm dg-muted">{WAITING_TEXT[order.status]}</p>}
      <button className="dg-button dg-secondary ml-2" onClick={() => setExpandedId(isOpen ? null : order._id)}>{isOpen ? "Close details" : canRecordPickup ? "Count & confirm garments" : order.status === "OUT_FOR_DELIVERY" ? "Verify & complete delivery" : order.status === "DELIVERED" ? "View delivery proof" : "View handover"}</button>
      {isOpen && <div className="mt-5 border-t pt-4">{canRecordPickup ? <HandoverEditor order={order} endpoint={`/rider/orders/${order._id}/handover`} onSaved={load} /> : order.status === "OUT_FOR_DELIVERY" ? <RiderDeliveryForm order={order} onSaved={load} /> : order.status === "DELIVERED" ? <DeliveryProofDetails proof={order.deliveryProof} /> : <HandoverDetails handover={order.handover} />}</div>}
      <div className="mt-4 flex gap-2"><input aria-label="Order note" placeholder="Gate code or pickup issue…" value={noteDrafts[order._id] || ""} onChange={(event) => setNoteDrafts((drafts) => ({ ...drafts, [order._id]: event.target.value }))} className="flex-1" /><button onClick={() => submitNote(order._id)} className="dg-button dg-secondary">Add note</button></div>
    </article>;
  }
  return <RoleLayout title="Rider" subtitle="Assigned pickups and deliveries">
    {error && <div className="dg-error" role="alert">{error} <button onClick={load} className="underline">Retry</button></div>}
    {loading && <p role="status" className="dg-empty">Loading assignments…</p>}
    <div className="dg-section-heading"><h2>Active ({activeOrders.length})</h2></div><div className="space-y-4">{activeOrders.map(renderOrder)}{!loading && activeOrders.length === 0 && <p className="dg-empty">No active assignments.</p>}</div>
    {!!pastOrders.length && <><div className="dg-section-heading"><h2>Completed</h2></div><div className="space-y-2">{pastOrders.map((order) => <div key={order._id} className="dg-card flex justify-between"><span>#{order._id.slice(-6).toUpperCase()} · {order.userId?.name}</span><span className="dg-status">{order.status.replaceAll("_", " ")}</span></div>)}</div></>}
  </RoleLayout>;
}
