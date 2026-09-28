import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";

export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [max, setMax] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load slots once on mount
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/admin/slots");
      setSlots(data.slots || []);
    } catch (e) {
      setError("Failed to fetch slots");
    } finally { setLoading(false); }
  }

  async function add() {
    try {
      await api.post("/admin/slots", { date, timeRange: time, maxOrders: max });
      setDate(""); setTime(""); setMax(5);
      load();
    } catch (e) {
      console.warn("Add slot failed", e);
    }
  }

  return (
    <AdminLayout title="Pickup / Delivery Slots">
      <Card>
        <h2>Add Slot</h2>
        <label>
          Date: <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <label>
          Time: <input type="time" value={time.split(":")[0]} onChange={e=>setTime(e.target.value+":00")} />
        </label>
        <label>
          Max Orders: <input type="number" min="1" value={max} onChange={e=>setMax(Number(e.target.value))} />
        </label>
        <button onClick={add}>Add</button>
      </Card>

      <h3>Existing Slots</h3>
      {loading && <p>Loading slots…</p>}
      {error && <p style={{color:"red"}}>{error}</p>}
      {slots?.length === 0 && <p>No slots have been created yet.</p>}
      {slots.map(s => (
        <Card key={s._id}>
          <p>
            <strong>{new Date(s.date).toLocaleDateString()}</strong> {s.timeRange} – <em>{s.bookedCount}/{s.maxOrders} booked</em>
          </p>
        </Card>
      ))}
    </AdminLayout>
  );
}