import React, { useState } from "react";
import api from "../api";

async function compressPhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file");
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
  if (dataUrl.length > 1_900_000) throw new Error("Choose a smaller delivery photo");
  return { dataUrl, caption: file.name.slice(0, 120) };
}

export function CustomerDeliveryCode({ order }) {
  const [otp, setOtp] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!["READY", "OUT_FOR_DELIVERY"].includes(order.status)) return null;
  async function generate() {
    setLoading(true); setError("");
    try { const response = await api.post(`/orders/${order._id}/delivery-otp`); setOtp(response.data.otp); setExpiresAt(response.data.expiresAt); }
    catch (err) { setError(err.response?.data?.error || "Could not generate delivery code"); }
    finally { setLoading(false); }
  }
  return <section className="dg-card dg-delivery-code">
    <h3>Delivery verification</h3>
    <p className="dg-muted text-sm">Generate this private code when the rider is at your door. Share it only after checking your garments.</p>
    {otp && <div className="dg-otp" aria-live="polite"><span>Your delivery code</span><strong>{otp}</strong><small>Valid until {new Date(expiresAt).toLocaleString("en-IN")}</small></div>}
    {error && <div className="dg-error">{error}</div>}
    <button className="dg-button" disabled={loading} onClick={generate}>{loading ? "Generating…" : otp ? "Generate a new code" : "Generate delivery code"}</button>
  </section>;
}

export function DeliveryProofDetails({ proof }) {
  if (!proof?.verifiedAt) return <p className="dg-muted text-sm">Delivery proof has not been recorded yet.</p>;
  return <div className="dg-delivery-details">
    <div className="dg-count-banner"><strong>{proof.deliveredGarmentCount} delivered</strong><span>{proof.expectedGarmentCount} expected</span><span>OTP verified</span></div>
    <div className="dg-proof-grid"><p><b>Recipient</b><span>{proof.recipientName}</span></p><p><b>Delivered at</b><span>{new Date(proof.verifiedAt).toLocaleString("en-IN")}</span></p><p><b>Rider</b><span>{proof.verifiedByName}</span></p><p><b>Collection</b><span>{proof.cashCollected ? `₹${proof.collectedAmount} · ${proof.collectionMethod || "Cash"}` : "No cash collected"}</span></p></div>
    {proof.missingOrDamagedNotes && <p className="dg-proof-note"><b>Missing/damaged garments:</b> {proof.missingOrDamagedNotes}</p>}
    {(proof.location?.address || proof.location?.lat != null) && <p className="text-sm"><b>Location:</b> {proof.location.address || `${proof.location.lat}, ${proof.location.lng}`}</p>}
    {(proof.photo?.url || proof.photo?.dataUrl) && <a href={proof.photo.url || proof.photo.dataUrl} target="_blank" rel="noreferrer" className="dg-proof-photo"><img src={proof.photo.url || proof.photo.dataUrl} alt="Delivery proof" />View full photo</a>}
    {!!proof.auditTrail?.length && <details><summary>Delivery audit trail</summary><ul className="dg-audit-list">{proof.auditTrail.map((entry, index) => <li key={index}><strong>{entry.action}</strong> · {entry.changedByName} ({entry.changedByRole}) · {new Date(entry.timestamp).toLocaleString("en-IN")}<br />{entry.note}</li>)}</ul></details>}
  </div>;
}

export function RiderDeliveryForm({ order, onSaved }) {
  const expected = (order.handover?.items || []).reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0);
  const [form, setForm] = useState({ otp: "", recipientName: order.userId?.name || "", deliveredGarmentCount: expected, missingOrDamagedNotes: "", photo: null, cashCollected: order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "UNPAID", collectedAmount: order.paymentStatus === "UNPAID" ? order.total : 0, collectionMethod: "CASH", collectionReference: "", location: { lat: "", lng: "", address: "" } });
  const [saving, setSaving] = useState(false); const [locating, setLocating] = useState(false); const [error, setError] = useState("");
  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function choosePhoto(file) { try { setError(""); field("photo", await compressPhoto(file)); } catch (err) { setError(err.message); } }
  function captureLocation() {
    if (!navigator.geolocation) return setError("Location is not available on this device");
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { field("location", { ...form.location, lat: coords.latitude, lng: coords.longitude }); setLocating(false); },
      () => { setError("Location permission was not granted. You can enter the address manually."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError("");
    try { const response = await api.post(`/rider/orders/${order._id}/delivery-proof`, form); onSaved?.(response.data.order); }
    catch (err) { setError(err.response?.data?.error || "Could not complete delivery"); }
    finally { setSaving(false); }
  }
  return <form className="dg-delivery-form" onSubmit={submit}>
    <div><h3>Confirm delivery</h3><p className="dg-muted text-sm">Check the garments with the recipient, then record proof.</p></div>
    <label>Customer OTP<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required value={form.otp} onChange={(e) => field("otp", e.target.value.replace(/\D/g, ""))} placeholder="6-digit delivery code" /></label>
    <div className="dg-form-grid"><label>Recipient name<input required value={form.recipientName} onChange={(e) => field("recipientName", e.target.value)} /></label><label>Garments delivered<input type="number" min="0" max={expected} required value={form.deliveredGarmentCount} onChange={(e) => field("deliveredGarmentCount", Number(e.target.value))} /><small>{expected} expected</small></label></div>
    <label>Missing or damaged garment notes<textarea rows="3" value={form.missingOrDamagedNotes} onChange={(e) => field("missingOrDamagedNotes", e.target.value)} placeholder="Required if the delivered count differs or damage is found" /></label>
    <label>Optional delivery photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files[0] && choosePhoto(e.target.files[0])} /></label>
    {form.photo && <div className="dg-photo-row"><div><img src={form.photo.dataUrl} alt="Delivery preview" /><button type="button" onClick={() => field("photo", null)}>Remove</button></div></div>}
    {order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "UNPAID" && <fieldset className="dg-cod"><legend>Cash-on-delivery collection</legend><label className="dg-check"><input type="checkbox" checked={form.cashCollected} onChange={(e) => field("cashCollected", e.target.checked)} /> Full payment collected</label><div className="dg-form-grid"><label>Amount collected<input type="number" min="0" step="0.01" value={form.collectedAmount} onChange={(e) => field("collectedAmount", Number(e.target.value))} /></label><label>Method<select value={form.collectionMethod} onChange={(e) => field("collectionMethod", e.target.value)}><option>CASH</option><option>UPI</option><option>CARD</option></select></label></div><label>Reference (optional)<input value={form.collectionReference} onChange={(e) => field("collectionReference", e.target.value)} placeholder="Receipt or UPI reference" /></label></fieldset>}
    <fieldset className="dg-location"><legend>Delivery location</legend><button type="button" className="dg-button dg-secondary" onClick={captureLocation} disabled={locating}>{locating ? "Getting location…" : form.location.lat !== "" ? "Location captured ✓" : "Use current location"}</button><label>Address or location note<input value={form.location.address} onChange={(e) => field("location", { ...form.location, address: e.target.value })} placeholder="Building, lobby, reception…" /></label></fieldset>
    {error && <div className="dg-error">{error}</div>}
    <button className="dg-button" disabled={saving || form.otp.length !== 6}>{saving ? "Verifying…" : "Verify OTP & complete delivery"}</button>
  </form>;
}
