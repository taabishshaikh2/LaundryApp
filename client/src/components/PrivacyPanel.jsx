import React, { useState } from "react";
import api from "../api";

export default function PrivacyPanel() {
  const [message, setMessage] = useState("");
  async function exportData() { try { const response = await api.get("/operations/privacy/export", { responseType: "blob" }); const url = URL.createObjectURL(response.data); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "dhobi-ghat-data.json"; anchor.click(); URL.revokeObjectURL(url); } catch { setMessage("Could not export your data."); } }
  async function requestDeletion() { const reason = window.prompt("Why would you like to delete your account? (optional)") || ""; try { await api.post("/operations/privacy/delete-request", { reason }); setMessage("Deletion request submitted for admin review."); } catch (err) { setMessage(err.response?.data?.error || "Could not submit deletion request."); } }
  return <div><h3 className="font-semibold">Privacy & data</h3><p className="dg-muted mt-2">Download a copy of your information or request account deletion.</p><div className="dg-inline-form mt-4"><button className="dg-button dg-secondary" onClick={exportData}>Export my data</button><button className="dg-button dg-danger" onClick={requestDeletion}>Request deletion</button></div>{message && <p className="dg-muted mt-3">{message}</p>}</div>;
}
