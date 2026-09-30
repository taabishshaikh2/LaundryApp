import React, { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { HandoverDetails, HandoverEditor } from "../components/HandoverRecord";
import { AdminCancellation, AdminRefundEditor, CancellationDetails } from "../components/CancellationRecord";
import { AdminPricingRevision } from "../components/PricingRevision";
import { ProcessingTimeline } from "../components/ProcessingWorkflow";
import { DeliveryProofDetails } from "../components/DeliveryProof";

const STATUS_LIST = ["ORDER_PLACED", "PICKUP_ASSIGNED", "RIDER_ON_THE_WAY", "PICKED_UP", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function AdminOrders() {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  async function load() { try { const [orderResult, riderResult, partnerResult] = await Promise.all([api.get("/orders/admin/all"), api.get("/admin/riders"), api.get("/admin/laundry-partners")]); setOrders(orderResult.data.orders); setRiders(riderResult.data.riders); setPartners(partnerResult.data.partners); } catch { showError("Failed to load orders"); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function updateStatus(order, status) {
    if (status === "CANCELLED") { setExpandedId(order._id); setCancellingId(order._id); return; }
    setUpdatingId(order._id);
    try { await api.put(`/orders/admin/${order._id}/status`, { status }); showSuccess("Status updated"); await load(); }
    catch (err) { showError(err.response?.data?.error || err.response?.data?.detail || "Failed to update status"); }
    finally { setUpdatingId(null); }
  }
  async function assign(orderId, body, path = "assign") { setUpdatingId(orderId); try { await api.put(`/orders/admin/${orderId}/${path}`, body); showSuccess("Assignment saved"); await load(); } catch (err) { showError(err.response?.data?.error || "Could not save assignment"); } finally { setUpdatingId(null); } }
  const filtered = orders.filter((order) => { const q = search.toLowerCase(); return (!statusFilter || order.status === statusFilter) && (!q || [order._id, order.userId?.name, order.userId?.phone].some((value) => value?.toString().toLowerCase().includes(q))); });
  function exportCSV() { const rows = [["Order ID", "Customer", "Ordered garments", "Received garments", "Status", "Refund status", "Refund amount"], ...filtered.map((order) => [order._id, order.userId?.name || "", order.items.reduce((sum, item) => sum + item.quantity, 0), order.handover?.items?.reduce((sum, item) => sum + item.receivedQuantity, 0) || 0, order.status, order.cancellation?.refundStatus || "", order.cancellation?.refundAmount || 0])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "orders-handover-refunds.csv"; link.click(); URL.revokeObjectURL(link.href); }
  if (loading) return <AdminLayout title="Orders"><Skeleton variant="card" count={3} /></AdminLayout>;
  return <AdminLayout title="Orders">
    <div className="dg-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, or phone" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{STATUS_LIST.map((status) => <option key={status}>{status}</option>)}</select><button className="dg-button" onClick={exportCSV} disabled={!filtered.length}>Export records</button></div>
    {!filtered.length ? <Card><EmptyState icon="📦" title="No orders found" description="Try another search or status." /></Card> : <div className="space-y-4">{filtered.map((order) => {
      const open = expandedId === order._id;
      const orderedCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const receivedCount = order.handover?.items?.reduce((sum, item) => sum + item.receivedQuantity, 0);
      const processingOverdue = order.processing?.dueAt && new Date(order.processing.dueAt) < new Date() && !["READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(order.status);
      return <Card key={order._id} padding="lg" className="dg-admin-order-card">
        <div className="dg-order-head"><div><p className="dg-eyebrow">ORDER #{order._id.slice(-6).toUpperCase()}</p><h2>{order.userId?.name || "Customer"}</h2><p className="dg-muted">{order.userId?.phone} · {order.serviceName} · ₹{order.total}</p></div><div className="flex gap-2"><span className="dg-status">{order.status.replaceAll("_", " ")}</span>{processingOverdue && <span className="dg-status is-overdue">DELAYED</span>}</div></div>
        <div className="dg-admin-order-metrics"><div><span>Ordered</span><strong>{orderedCount}</strong></div><div><span>Received</span><strong>{order.handover?.confirmedAt ? receivedCount : "Pending"}</strong></div><div><span>Pickup</span><strong>{order.pickupSlot ? `${new Date(order.pickupSlot.date).toLocaleDateString("en-IN")} · ${order.pickupSlot.timeRange}` : order.speed === "EXPRESS" ? "Express" : "—"}</strong></div><div><span>{order.status === "CANCELLED" ? "Refund" : "Revised bill"}</span><strong>{order.status === "CANCELLED" ? order.cancellation?.refundStatus?.replaceAll("_", " ") : order.pricingRevisions?.at(-1)?.status?.replaceAll("_", " ") || "Not needed"}</strong></div></div>
        <div className="dg-admin-actions"><label>Status<select value={order.status} disabled={updatingId === order._id} onChange={(event) => updateStatus(order, event.target.value)}>{STATUS_LIST.map((status) => <option key={status}>{status}</option>)}</select></label><label>Rider<select value={order.riderId?._id || ""} disabled={updatingId === order._id || order.status === "CANCELLED"} onChange={(event) => event.target.value && assign(order._id, { riderId: event.target.value, deliveryMethod: order.deliveryMethod || "STANDARD" })}><option value="">Unassigned</option>{riders.map((rider) => <option key={rider._id} value={rider._id}>{rider.name}</option>)}</select></label><label>Partner<select value={order.partnerId?._id || ""} disabled={updatingId === order._id || order.status === "CANCELLED"} onChange={(event) => event.target.value && assign(order._id, { partnerId: event.target.value }, "assign-partner")}><option value="">Unassigned</option>{partners.map((partner) => <option key={partner._id} value={partner._id}>{partner.businessName}</option>)}</select></label><button className="dg-button dg-secondary" onClick={() => setExpandedId(open ? null : order._id)}>{open ? "Close record" : "Open full record"}</button></div>
        {open && <div className="dg-order-record">
          {cancellingId === order._id && order.status !== "CANCELLED" && <AdminCancellation order={order} onClose={() => setCancellingId(null)} onSaved={() => { setCancellingId(null); showSuccess("Order cancelled and refund rule applied"); load(); }} />}
          <section><h3>Ordered garments</h3>{order.items.map((item, index) => <p key={index}>{item.name} × {item.quantity}</p>)}</section>
          {order.status === "CANCELLED" ? <><CancellationDetails cancellation={order.cancellation} /><AdminRefundEditor order={order} onSaved={load} /></> : order.handover?.confirmedAt ? <><HandoverDetails handover={order.handover} />{order.status !== "DELIVERED" && <details className="mt-4"><summary>Edit handover record</summary><HandoverEditor order={order} endpoint={`/orders/admin/${order._id}/handover`} onSaved={load} title="Correct handover record" /></details>}</> : <HandoverEditor order={order} endpoint={`/orders/admin/${order._id}/handover`} onSaved={load} title="Record handover for rider" />}
          {order.status !== "CANCELLED" && order.handover?.confirmedAt && <AdminPricingRevision order={order} onSaved={load} />}
          {order.processing?.requiredStages?.length > 0 && <section><h3>Laundry processing & quality</h3><ProcessingTimeline order={order} /></section>}
          <section><h3>Proof of delivery</h3><DeliveryProofDetails proof={order.deliveryProof} /></section>
          <section><h3>Status history</h3><ul className="dg-audit-list">{order.statusHistory.map((entry, index) => <li key={index}>{entry.previousStatus || "Created"} → {entry.newStatus} · {entry.changedByRole} · {new Date(entry.timestamp).toLocaleString("en-IN")}{entry.note && <><br />{entry.note}</>}</li>)}</ul></section>
        </div>}
      </Card>;
    })}</div>}
  </AdminLayout>;
}
