import React, { useEffect, useState } from "react";
import api from "../api";

async function download(path, filename) {
  const response = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

export default function OrderDocuments({ order }) {
  const [rating, setRating] = useState(null); const [form, setForm] = useState({ overall: 5, riderScore: 5, partnerScore: 5, comment: "" }); const [message, setMessage] = useState("");
  useEffect(() => { api.get(`/operations/orders/${order._id}/rating`).then(response => { if (response.data.rating) { setRating(response.data.rating); setForm(response.data.rating); } }).catch(() => {}); }, [order._id]);
  async function submit(e) { e.preventDefault(); try { const response = await api.post(`/operations/orders/${order._id}/rating`, form); setRating(response.data.rating); setMessage("Thank you for your feedback."); } catch (err) { setMessage(err.response?.data?.error || "Could not save rating"); } }
  return <section className="dg-card mt-5"><h3>Invoice, label & feedback</h3><div className="dg-inline-form mt-4"><button className="dg-button dg-secondary" onClick={() => download(`/operations/orders/${order._id}/invoice`, `invoice-${order._id.slice(-6)}.pdf`)}>Download GST invoice</button><button className="dg-button dg-secondary" onClick={() => download(`/operations/orders/${order._id}/label`, `bag-label-${order._id.slice(-6)}.pdf`)}>Download bag label</button></div>{order.status === "DELIVERED" && <form className="dg-rating-form mt-5" onSubmit={submit}><h4>{rating ? "Your rating" : "Rate this order"}</h4><div className="dg-form-grid"><label>Overall<select value={form.overall} onChange={e => setForm({ ...form, overall: Number(e.target.value) })}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></label><label>Rider<select value={form.riderScore || 5} onChange={e => setForm({ ...form, riderScore: Number(e.target.value) })}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></label><label>Laundry quality<select value={form.partnerScore || 5} onChange={e => setForm({ ...form, partnerScore: Number(e.target.value) })}>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}</select></label></div><textarea aria-label="Rating comment" placeholder="What went well or needs improvement?" value={form.comment || ""} onChange={e => setForm({ ...form, comment: e.target.value })} /><button className="dg-button">{rating ? "Update rating" : "Submit rating"}</button>{message && <p className="dg-muted">{message}</p>}</form>}</section>;
}
