import React, { useEffect, useState } from "react";
import api from "../api";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const sameItem = (left, right) => left?.garmentId && right?.garmentId
  ? String(left.garmentId) === String(right.garmentId)
  : String(left?.name || "").toLowerCase() === String(right?.name || "").toLowerCase();
const latest = (order) => order.pricingRevisions?.[order.pricingRevisions.length - 1];
const hasDifferences = (order) => order.handover?.items?.some((item) => Number(item.orderedQuantity) !== Number(item.receivedQuantity));

export function RevisedBill({ revision, compact = false }) {
  if (!revision) return null;
  return <div className="dg-revised-bill">
    <div className="flex justify-between gap-3 items-center"><h3>Revised bill v{revision.version}</h3><span className={`dg-status revision-${revision.status?.toLowerCase()}`}>{revision.status?.replaceAll("_", " ")}</span></div>
    <div className="dg-bill-table">
      <div className="dg-bill-row dg-bill-head"><span>Garment</span><span>Received</span><span>Rate</span><span>Total</span></div>
      {revision.lines.map((line, index) => <div className="dg-bill-row" key={`${line.name}-${index}`}><span><strong>{line.name}</strong>{!compact && line.reason && <small>{line.reason}</small>}</span><span>{line.receivedQuantity}</span><span>{money(line.unitPrice)}</span><span>{money(line.lineTotal)}</span></div>)}
    </div>
    <div className="dg-bill-totals"><p><span>Original total</span><s>{money(revision.originalTotal)}</s></p><p><span>Revised subtotal</span><strong>{money(revision.revisedSubtotal)}</strong></p>{revision.taxEnabled && <p><span>{revision.taxLabel} ({revision.taxPercent}%)</span><strong>{money(revision.revisedTaxAmount)}</strong></p>}<p className="total"><span>Revised total</span><strong>{money(revision.revisedTotal)}</strong></p></div>
    {revision.note && <p className="text-sm"><b>Admin note:</b> {revision.note}</p>}
    {revision.responseNote && <p className="text-sm"><b>Customer response:</b> {revision.responseNote}</p>}
    <p className="text-xs dg-muted">Prepared by {revision.createdByName} on {new Date(revision.createdAt).toLocaleString("en-IN")}</p>
  </div>;
}

export function AdminPricingRevision({ order, onSaved }) {
  const current = latest(order);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setLines((order.handover?.items || []).map((received) => {
      const ordered = order.items.find((item) => sameItem(item, received));
      return { garmentId: received.garmentId || null, name: received.name, orderedQuantity: received.orderedQuantity, receivedQuantity: received.receivedQuantity, unitPrice: ordered?.unitPrice || 0, reason: received.orderedQuantity === received.receivedQuantity ? "No quantity change" : `${received.receivedQuantity} received instead of ${received.orderedQuantity} ordered` };
    }));
  }, [order._id, order.handover?.lastUpdatedAt]);
  if (!order.handover?.confirmedAt) return null;
  if (!hasDifferences(order)) return <div className="dg-pricing-resolved">✓ Ordered and received quantities match. The original bill remains valid.</div>;
  const revisionMatchesHandover = current && new Date(current.handoverUpdatedAt).getTime() >= new Date(order.handover.lastUpdatedAt).getTime();
  const resolved = current?.status === "APPROVED" && revisionMatchesHandover;
  const pending = current?.status === "PENDING_CUSTOMER" && revisionMatchesHandover;
  const updateLine = (index, field, value) => setLines((existing) => existing.map((line, i) => i === index ? { ...line, [field]: value } : line));
  async function createRevision() { setSaving(true); setError(""); try { const response = await api.post(`/orders/admin/${order._id}/pricing-revision`, { lines, note }); onSaved?.(response.data.order); } catch (err) { setError(err.response?.data?.error || "Could not create revised bill"); } finally { setSaving(false); } }
  return <section className="dg-pricing-admin">
    <div className="dg-section-heading"><div><h3>Pricing correction</h3><p className="dg-muted text-sm">Processing stays blocked until the customer approves the current handover bill.</p></div></div>
    {current && <RevisedBill revision={current} />}
    {pending && <div className="dg-waiting-approval">Waiting for customer approval. The laundry must not start processing yet.</div>}
    {resolved && <div className="dg-pricing-resolved">✓ Customer approved this bill. Processing may continue.</div>}
    {!pending && !resolved && <div className="dg-revision-form">
      {current?.status === "REJECTED" && <div className="dg-error">The customer rejected version {current.version}. Correct the bill and send a new version.</div>}
      {!revisionMatchesHandover && current && <div className="dg-error">The handover changed after the last bill. Send a fresh revision.</div>}
      {lines.map((line, index) => <div className="dg-price-line" key={`${line.name}-${index}`}><div><strong>{line.name}</strong><small>{line.receivedQuantity} received · {line.orderedQuantity} ordered</small></div><label>Unit price<input type="number" min="0" step="0.01" value={line.unitPrice} disabled={line.orderedQuantity > 0} onChange={(event) => updateLine(index, "unitPrice", Number(event.target.value))} /></label><label>Reason<input value={line.reason} onChange={(event) => updateLine(index, "reason", event.target.value)} /></label><strong>{money(line.receivedQuantity * line.unitPrice)}</strong></div>)}
      <label>Message to customer<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain the count and price change" /></label>
      {error && <div className="dg-error">{error}</div>}
      <button className="dg-button" disabled={saving || lines.some((line) => line.receivedQuantity > 0 && line.unitPrice <= 0)} onClick={createRevision}>{saving ? "Sending…" : "Send revised bill for approval"}</button>
    </div>}
    {order.pricingRevisions?.length > 1 && <details><summary>Earlier bill versions</summary><div className="space-y-3">{order.pricingRevisions.slice(0, -1).map((revision) => <RevisedBill key={revision.version} revision={revision} compact />)}</div></details>}
  </section>;
}

export function CustomerPricingApproval({ order, onSaved }) {
  const revision = latest(order);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!revision) return null;
  const stale = new Date(revision.handoverUpdatedAt).getTime() < new Date(order.handover?.lastUpdatedAt).getTime();
  async function respond(response) { setSaving(true); setError(""); try { const result = await api.post(`/orders/${order._id}/pricing-revision/respond`, { response, note }); onSaved?.(result.data.order); } catch (err) { setError(err.response?.data?.error || "Could not save your response"); } finally { setSaving(false); } }
  return <section className="dg-card dg-customer-pricing"><p className="dg-eyebrow">PRICE CONFIRMATION</p><RevisedBill revision={revision} />
    {stale && <div className="dg-error">This bill is outdated because the handover was corrected. Please wait for a new version.</div>}
    {revision.status === "PENDING_CUSTOMER" && !stale && <div className="dg-approval-actions"><p>Please check the garment quantities and revised total before the laundry starts processing.</p>{error && <div className="dg-error">{error}</div>}{rejecting ? <><label>Why are you rejecting this bill?<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="flex gap-2"><button className="dg-button" disabled={saving || note.trim().length < 3} onClick={() => respond("REJECT")}>{saving ? "Sending…" : "Send rejection"}</button><button className="dg-button dg-secondary" onClick={() => setRejecting(false)}>Back</button></div></> : <div className="flex gap-2"><button className="dg-button" disabled={saving} onClick={() => respond("APPROVE")}>{saving ? "Approving…" : `Approve ${money(revision.revisedTotal)}`}</button><button className="dg-button dg-secondary" onClick={() => setRejecting(true)}>Reject and explain</button></div>}</div>}
  </section>;
}

