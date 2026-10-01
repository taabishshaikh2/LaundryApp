import React, { useEffect, useState } from "react";
import api from "../api";

export default function RetentionPanel() {
  const [data, setData] = useState(null); const [code, setCode] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { api.get("/growth/retention").then((response) => setData(response.data)).catch(() => {}); }, []);
  async function apply() { try { const response = await api.post("/growth/referral/apply", { code }); setData((current) => ({ ...current, referralCredit: response.data.referralCredit })); setMessage("Referral applied. ₹50 credit added."); } catch (err) { setMessage(err.response?.data?.error || "Could not apply referral"); } }
  if (!data) return null;
  return <div className="dg-retention"><h3>Rewards and saved garments</h3><div className="dg-referral-card"><div><span>Your referral code</span><strong>{data.referralCode}</strong><small>Share it with a friend. Both accounts receive ₹50 pilot credit.</small></div><div><span>Available credit</span><strong>₹{Number(data.referralCredit || 0).toFixed(2)}</strong></div></div><div className="dg-promo-entry"><input placeholder="Enter a friend's referral code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /><button className="dg-button dg-secondary" disabled={!code} onClick={apply}>Apply referral</button></div><div><strong>Saved garment preferences</strong>{data.savedGarments?.length ? <ul className="dg-saved-list">{data.savedGarments.map((item) => <li key={item._id || item.garmentId?._id}>{item.garmentId?.name || "Garment"} × {item.quantity}</li>)}</ul> : <p className="dg-muted">Save a garment bag from the booking page for faster future orders.</p>}</div>{message && <p className="dg-success">{message}</p>}</div>;
}
