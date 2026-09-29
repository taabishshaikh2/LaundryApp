import React, { useEffect, useState } from "react";
import api from "../api";

const isGenericUnexpectedName = (name) => !String(name || "").trim() || String(name).trim().toLowerCase().startsWith("unexpected garment");

function initialItems(order) {
  if (order.handover?.items?.length) return order.handover.items;
  return order.items.map((item) => ({
    garmentId: item.garmentId,
    name: item.name,
    orderedQuantity: item.quantity,
    receivedQuantity: item.quantity,
    stainNotes: item.hasStain ? "Stain reported by customer" : "",
    damageNotes: "",
    specialCareNotes: "",
    photos: [],
  }));
}

async function compressPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  if (dataUrl.length > 950000) throw new Error("This photo is still too large. Please choose a smaller image");
  return { dataUrl, caption: file.name.slice(0, 120) };
}

export function HandoverDetails({ handover }) {
  if (!handover?.confirmedAt) return <p className="dg-muted text-sm">Pickup handover has not been confirmed yet.</p>;
  const ordered = handover.items.reduce((sum, item) => sum + item.orderedQuantity, 0);
  const received = handover.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  return <div className="dg-handover-view">
    <div className={`dg-count-banner ${ordered !== received ? "has-difference" : ""}`}>
      <strong>{received} received</strong><span>{ordered} ordered</span>
      <span>{received === ordered ? "Counts match" : `${received - ordered > 0 ? "+" : ""}${received - ordered} difference`}</span>
    </div>
    <div className="space-y-3">
      {handover.items.map((item, index) => <div className="dg-received-item" key={`${item.name}-${index}`}>
        <div className="flex justify-between gap-3"><strong>{item.orderedQuantity === 0 && isGenericUnexpectedName(item.name) ? "Actual garment name not recorded" : item.name}{item.orderedQuantity === 0 && <small className="block dg-muted">Unexpected item</small>}</strong><span>{item.receivedQuantity} received / {item.orderedQuantity} ordered</span></div>
        {item.stainNotes && <p><b>Stain:</b> {item.stainNotes}</p>}
        {item.damageNotes && <p><b>Damage:</b> {item.damageNotes}</p>}
        {item.specialCareNotes && <p><b>Special care:</b> {item.specialCareNotes}</p>}
        {!!item.photos?.length && <div className="dg-photo-row">{item.photos.map((photo, photoIndex) => <a href={photo.dataUrl} target="_blank" rel="noreferrer" key={photoIndex}><img src={photo.dataUrl} alt={`${item.name} pickup ${photoIndex + 1}`} /></a>)}</div>}
      </div>)}
    </div>
    {handover.generalNotes && <p className="text-sm mt-3"><b>General note:</b> {handover.generalNotes}</p>}
    <p className="text-xs dg-muted mt-3">Confirmed by {handover.confirmedByName || handover.confirmedByRole} on {new Date(handover.confirmedAt).toLocaleString("en-IN")}</p>
    {!!handover.auditTrail?.length && <details className="mt-3"><summary>Handover audit trail</summary><ul className="dg-audit-list">{handover.auditTrail.map((entry, index) => <li key={index}><strong>{entry.action}</strong> · {entry.changedByName} ({entry.changedByRole}) · {new Date(entry.timestamp).toLocaleString("en-IN")}<br />{entry.summary}</li>)}</ul></details>}
  </div>;
}

export function HandoverEditor({ order, endpoint, onSaved, title = "Confirm garment handover" }) {
  const [items, setItems] = useState(() => initialItems(order));
  const [generalNotes, setGeneralNotes] = useState(order.handover?.generalNotes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setItems(initialItems(order)); setGeneralNotes(order.handover?.generalNotes || ""); }, [order._id, order.handover?.lastUpdatedAt]);
  const update = (index, field, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  const addUnexpectedGarment = () => setItems((current) => [...current, { garmentId: null, name: "", orderedQuantity: 0, receivedQuantity: 1, stainNotes: "", damageNotes: "", specialCareNotes: "", photos: [] }]);
  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));
  async function addPhotos(index, files) {
    try {
      setError("");
      const existing = items[index].photos || [];
      if (existing.length + files.length > 3) throw new Error("Maximum 3 photos per garment");
      const photos = await Promise.all(Array.from(files).map(compressPhoto));
      update(index, "photos", [...existing, ...photos]);
    } catch (err) { setError(err.message); }
  }
  async function save() {
    setSaving(true); setError("");
    try {
      const response = await api.put(endpoint, { items, generalNotes });
      onSaved?.(response.data.order);
    } catch (err) { setError(err.response?.data?.error || "Could not save handover"); }
    finally { setSaving(false); }
  }
  return <section className="dg-handover-editor">
    <div className="dg-section-heading"><div><h3>{title}</h3><p className="dg-muted text-sm">Count every physical garment before confirming pickup.</p></div></div>
    {items.map((item, index) => <div className="dg-handover-item" key={`${item.name}-${index}`}>
      <div className="flex justify-between gap-3 items-center">{item.orderedQuantity === 0 ? <label className="flex-1">What unexpected item was received?<input required aria-label="Actual unexpected garment name" placeholder="Example: Shirt, bedsheet, scarf" value={item.name} onChange={(event) => update(index, "name", event.target.value)} /><small className="dg-muted">Enter the actual garment name, not “unexpected garment”.</small></label> : <strong>{item.name}</strong>}<span className="text-sm dg-muted">Ordered: {item.orderedQuantity}</span></div>
      <label>Quantity received<input type="number" min="0" max="200" value={item.receivedQuantity} onChange={(event) => update(index, "receivedQuantity", Number(event.target.value))} /></label>
      <div className="dg-form-grid">
        <label>Stain notes<textarea rows="2" value={item.stainNotes || ""} onChange={(event) => update(index, "stainNotes", event.target.value)} placeholder="Location and type of stain" /></label>
        <label>Damage notes<textarea rows="2" value={item.damageNotes || ""} onChange={(event) => update(index, "damageNotes", event.target.value)} placeholder="Tear, missing button, colour damage…" /></label>
      </div>
      <label>Special-care notes<textarea rows="2" value={item.specialCareNotes || ""} onChange={(event) => update(index, "specialCareNotes", event.target.value)} placeholder="Customer instructions or fabric care" /></label>
      <label className="dg-photo-input">Optional photos (max 3)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addPhotos(index, event.target.files); event.target.value = ""; }} /></label>
      {!!item.photos?.length && <div className="dg-photo-row">{item.photos.map((photo, photoIndex) => <div key={photoIndex}><img src={photo.dataUrl} alt="Garment preview" /><button type="button" onClick={() => update(index, "photos", item.photos.filter((_, i) => i !== photoIndex))}>Remove</button></div>)}</div>}
      {item.orderedQuantity === 0 && <button type="button" className="dg-remove-line" onClick={() => removeItem(index)}>Remove unexpected garment</button>}
    </div>)}
    <button type="button" className="dg-button dg-secondary" onClick={addUnexpectedGarment}>Add unexpected garment</button>
    <label>General pickup notes<textarea rows="3" value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} placeholder="Bag count, packaging, customer confirmation…" /></label>
    {error && <div className="dg-error" role="alert">{error}</div>}
    {items.some((item) => item.orderedQuantity === 0 && isGenericUnexpectedName(item.name)) && <div className="dg-error">Enter the actual name of every unexpected garment before saving.</div>}
    <button className="dg-button" type="button" disabled={saving || items.some((item) => item.orderedQuantity === 0 && isGenericUnexpectedName(item.name))} onClick={save}>{saving ? "Saving…" : order.handover?.confirmedAt ? "Save handover changes" : "Confirm pickup handover"}</button>
  </section>;
}

