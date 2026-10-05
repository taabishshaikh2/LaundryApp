import React, { useEffect, useState } from "react";
import api from "../api";

const categories = [
  ["MISSING_GARMENT", "Missing garment"], ["DAMAGED_GARMENT", "Damaged garment"], ["STAIN_REMAINING", "Stain remaining"],
  ["DELAYED_DELIVERY", "Delayed delivery"], ["BILLING", "Billing issue"], ["OTHER", "Other"],
];

async function compressPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
  const scale = Math.min(1, 1100 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.68);
  if (dataUrl.length > 950000) throw new Error("Choose a smaller photo");
  return { dataUrl, caption: file.name.slice(0, 120) };
}

export default function IssueCenter({ order }) {
  const [issues, setIssues] = useState([]); const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "MISSING_GARMENT", description: "", photos: [] });
  const [reply, setReply] = useState({}); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function load() { try { const response = await api.get("/issues/mine"); setIssues(response.data.issues.filter((issue) => String(issue.orderId?._id || issue.orderId) === order._id)); } catch { setError("Could not load order issues"); } }
  useEffect(() => { load(); }, [order._id]);
  async function choosePhotos(files) { try { setError(""); if (form.photos.length + files.length > 3) throw new Error("Maximum 3 photos"); const added = await Promise.all(Array.from(files).map(compressPhoto)); setForm({ ...form, photos: [...form.photos, ...added] }); } catch (err) { setError(err.message); } }
  async function submit(event) { event.preventDefault(); setSaving(true); setError(""); try { await api.post("/issues", { orderId: order._id, ...form }); setForm({ category: "MISSING_GARMENT", description: "", photos: [] }); setShowForm(false); await load(); } catch (err) { setError(err.response?.data?.error || "Could not raise issue"); } finally { setSaving(false); } }
  async function sendReply(issueId) { const text = String(reply[issueId] || "").trim(); if (!text) return; setSaving(true); setError(""); try { await api.post(`/issues/${issueId}/replies`, { text }); setReply({ ...reply, [issueId]: "" }); await load(); } catch (err) { setError(err.response?.data?.error || "Could not send reply"); } finally { setSaving(false); } }
  return <section className="dg-card dg-issue-center">
    <div className="dg-section-heading"><div><h2>Help with this order</h2><p className="dg-muted text-sm">Report missing or damaged garments, delays, stains, or billing problems.</p></div><button className="dg-button" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Report an issue"}</button></div>
    {showForm && <form onSubmit={submit} className="dg-issue-form"><label>Issue category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>What happened?<textarea required minLength="10" rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tell us what is missing, damaged, delayed, or incorrect…" /></label><label>Optional photos (maximum 3)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { choosePhotos(e.target.files); e.target.value = ""; }} /></label>{!!form.photos.length && <div className="dg-photo-row">{form.photos.map((photo, index) => <div key={index}><img src={photo.dataUrl} alt="Issue evidence" /><button type="button" onClick={() => setForm({ ...form, photos: form.photos.filter((_, i) => i !== index) })}>Remove</button></div>)}</div>}<button className="dg-button" disabled={saving}>{saving ? "Submitting…" : "Submit issue"}</button></form>}
    {error && <div className="dg-error">{error}</div>}
    {!!issues.length && <div className="dg-customer-issues">{issues.map((issue) => <article key={issue._id} className="dg-customer-issue"><div className="dg-issue-head"><div><strong>#{issue._id.slice(-6).toUpperCase()} · {issue.category.replaceAll("_", " ")}</strong><p>{issue.description}</p></div><div><span className={`dg-status issue-${issue.status.toLowerCase()}`}>{issue.status.replaceAll("_", " ")}</span><small>{issue.priority} priority</small></div></div>{!!issue.photos?.length && <div className="dg-photo-row">{issue.photos.map((photo, index) => <a key={index} href={photo.url || photo.dataUrl} target="_blank" rel="noreferrer"><img src={photo.url || photo.dataUrl} alt={`Issue evidence ${index + 1}`} /></a>)}</div>}{issue.resolutionDeadline && <p className="text-xs dg-muted">Target resolution: {new Date(issue.resolutionDeadline).toLocaleString("en-IN")}</p>}{issue.compensation?.type !== "NONE" && <div className="dg-compensation"><b>Resolution:</b> {issue.compensation.type.replaceAll("_", " ")}{issue.compensation.amount ? ` · ₹${issue.compensation.amount}` : ""}{issue.compensation.note ? ` · ${issue.compensation.note}` : ""}</div>}{!!issue.messages?.length && <div className="dg-issue-thread">{issue.messages.map((message) => <div key={message._id} className={message.addedByRole === "CUSTOMER" ? "from-customer" : "from-team"}><b>{message.addedByRole === "CUSTOMER" ? "You" : "Dhobi Ghat"}</b><p>{message.text}</p><small>{new Date(message.timestamp).toLocaleString("en-IN")}</small></div>)}</div>}{issue.status !== "CLOSED" && <div className="dg-reply-box"><textarea rows="2" value={reply[issue._id] || ""} onChange={(e) => setReply({ ...reply, [issue._id]: e.target.value })} placeholder="Reply to the support team…" /><button className="dg-button dg-secondary" disabled={saving || !reply[issue._id]?.trim()} onClick={() => sendReply(issue._id)}>Send reply</button></div>}</article>)}</div>}
    {!issues.length && !showForm && <p className="dg-empty">No issues reported for this order.</p>}
  </section>;
}
