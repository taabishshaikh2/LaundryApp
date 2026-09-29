import React, { useEffect, useState } from "react";
import api from "../api";

export function CancellationDetails({ cancellation }) {
  if (!cancellation?.cancelledAt) return null;
  return <div className="dg-cancellation">
    <h3>Cancellation & refund</h3>
    <p><b>Reason:</b> {cancellation.reason}</p>
    <p><b>Cancelled by:</b> {cancellation.cancelledByName || cancellation.cancelledByRole} · {new Date(cancellation.cancelledAt).toLocaleString("en-IN")}</p>
    <div className="dg-refund-status"><span>Refund: {cancellation.refundStatus?.replaceAll("_", " ")}</span><strong>₹{Number(cancellation.refundAmount || 0).toFixed(2)}</strong></div>
    {cancellation.refundMethod && <p><b>Method:</b> {cancellation.refundMethod}</p>}
    {cancellation.refundReference && <p><b>Reference:</b> {cancellation.refundReference}</p>}
    {!!cancellation.auditTrail?.length && <details><summary>Cancellation audit trail</summary><ul className="dg-audit-list">{cancellation.auditTrail.map((entry, index) => <li key={index}>{entry.action.replaceAll("_", " ")} · {entry.changedByName} ({entry.changedByRole}) · {new Date(entry.timestamp).toLocaleString("en-IN")}{entry.note && <><br />{entry.note}</>}</li>)}</ul></details>}
  </div>;
}

export function CustomerCancellation({ order, onSaved }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!["ORDER_PLACED", "PICKUP_ASSIGNED", "RIDER_ON_THE_WAY"].includes(order.status)) return null;
  async function cancel() {
    setSaving(true); setError("");
    try { const response = await api.post(`/orders/${order._id}/cancel`, { reason }); onSaved?.(response.data.order); }
    catch (err) { setError(err.response?.data?.error || "Could not cancel order"); }
    finally { setSaving(false); }
  }
  return <div className="mt-5">{!open ? <button className="dg-button dg-secondary" onClick={() => setOpen(true)}>Cancel this order</button> : <div className="dg-cancel-form"><h3>Cancel order</h3><p className="dg-muted text-sm">You can cancel until the rider confirms pickup. Any paid amount will enter the refund queue.</p><label>Reason<textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why are you cancelling?" /></label>{error && <div className="dg-error">{error}</div>}<div className="flex gap-2"><button className="dg-button" disabled={saving || reason.trim().length < 3} onClick={cancel}>{saving ? "Cancelling…" : "Confirm cancellation"}</button><button className="dg-button dg-secondary" onClick={() => setOpen(false)}>Keep order</button></div></div>}</div>;
}

export function AdminCancellation({ order, onSaved, onClose }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    setSaving(true); setError("");
    try { const response = await api.put(`/orders/admin/${order._id}/status`, { status: "CANCELLED", note: reason }); onSaved?.(response.data.order); }
    catch (err) { setError(err.response?.data?.error || "Could not cancel order"); }
    finally { setSaving(false); }
  }
  return <div className="dg-cancel-form"><h3>Cancel order #{order._id.slice(-6).toUpperCase()}</h3><p className="dg-muted text-sm">Unpaid orders need no refund. Paid orders enter the refund queue; pickups already confirmed require review.</p><label>Cancellation reason<textarea rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the reason for the customer and audit trail" /></label>{error && <div className="dg-error">{error}</div>}<div className="flex gap-2"><button className="dg-button" disabled={saving || reason.trim().length < 3} onClick={cancel}>{saving ? "Cancelling…" : "Cancel order"}</button><button className="dg-button dg-secondary" onClick={onClose}>Keep order</button></div></div>;
}

export function AdminRefundEditor({ order, onSaved }) {
  const cancellation = order.cancellation || {};
  const [form, setForm] = useState({ refundStatus: cancellation.refundStatus || "NOT_REQUIRED", refundAmount: cancellation.refundAmount || 0, refundMethod: cancellation.refundMethod || "", refundReference: cancellation.refundReference || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm({ refundStatus: cancellation.refundStatus || "NOT_REQUIRED", refundAmount: cancellation.refundAmount || 0, refundMethod: cancellation.refundMethod || "", refundReference: cancellation.refundReference || "" }), [order._id, cancellation.refundStatus, cancellation.refundAmount]);
  if (order.status !== "CANCELLED") return null;
  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  async function save() { setSaving(true); setError(""); try { const response = await api.put(`/orders/admin/${order._id}/refund`, form); onSaved?.(response.data.order); } catch (err) { setError(err.response?.data?.error || "Could not update refund"); } finally { setSaving(false); } }
  return <div className="dg-refund-editor"><h3>Refund tracking</h3><div className="dg-form-grid"><label>Status<select value={form.refundStatus} onChange={(event) => field("refundStatus", event.target.value)}>{["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED", "PROCESSED"].map((status) => <option key={status}>{status}</option>)}</select></label><label>Amount<input type="number" min="0" max={order.total} step="0.01" value={form.refundAmount} onChange={(event) => field("refundAmount", Number(event.target.value))} /></label><label>Method<input value={form.refundMethod} onChange={(event) => field("refundMethod", event.target.value)} placeholder="UPI, card, cash…" /></label><label>Reference<input value={form.refundReference} onChange={(event) => field("refundReference", event.target.value)} placeholder="Required when processed" /></label></div>{error && <div className="dg-error">{error}</div>}<button className="dg-button" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save refund record"}</button></div>;
}

