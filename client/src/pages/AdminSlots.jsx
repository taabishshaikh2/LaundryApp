import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import Input from "../components/ui/Input";
export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function load() {
    setLoading(true);
    try {
      const [slotsResponse, settingsResponse] = await Promise.all([api.get("/admin/slots"), api.get("/admin/settings")]);
      setSlots(slotsResponse.data.slots || []);
      setCapacity(current => current === 5 ? settingsResponse.data.settings.DEFAULT_MAX_ORDERS : current);
    } catch {
      setError("Couldn't load pickup slots. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function add(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (end <= start) {
      setError("The end time must be later than the start time.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/slots", {
        date,
        timeRange: `${start}-${end}`,
        maxOrders: Number(capacity)
      });
      setSuccess("Pickup slot created. Customers can now select it.");
      setDate("");
      setStart("");
      setEnd("");
      await load();
    } catch (e) {
      setError(e.response?.data?.error || "Couldn't create the slot. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return <AdminLayout title="Pickup slots"><div className="dg-booking-grid" style={{
      gridTemplateColumns: "minmax(0,1fr)"
    }}><section className="dg-card"><h2 className="text-heading-3 mb-2">Make room for the next pickup.</h2><p className="dg-muted mb-6">Create a time window and choose how many orders your team can handle.</p><form onSubmit={add}><div className="dg-form-grid"><Input label="Pickup date" type="date" min={minDate} required value={date} onChange={e => setDate(e.target.value)} /><Input label="Maximum orders" type="number" min="1" step="1" required value={capacity} onChange={e => setCapacity(e.target.value)} /><Input label="Start time" type="time" required value={start} onChange={e => setStart(e.target.value)} /><Input label="End time" type="time" required value={end} onChange={e => setEnd(e.target.value)} /></div>{error && <p role="alert" className="dg-error">{error}</p>}{success && <p role="status" className="text-sm text-brand-700 mt-4">{success}</p>}<button className="dg-button mt-6" disabled={saving}>{saving ? "Creating slot…" : "Create pickup slot"}</button></form></section><section className="dg-card"><div className="dg-section-heading" style={{
          marginTop: 0
        }}><h2>Scheduled pickups</h2><button className="dg-back" disabled={loading} onClick={() => {
            setError("");
            load();
          }}>Refresh</button></div>{loading ? <p role="status" className="dg-empty">Loading pickup slots…</p> : slots.length === 0 ? <p className="dg-empty">No pickup slots yet. Create your first time window above.</p> : <div className="dg-slot-grid">{[...slots].sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => <div key={s._id} className="dg-card"><p className="font-semibold">{new Date(s.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short"
              })}</p><p className="dg-muted">{s.timeRange}</p><p className="dg-status mt-3">{s.bookedCount || 0} / {s.maxOrders} booked</p></div>)}</div>}</section></div></AdminLayout>;
}
