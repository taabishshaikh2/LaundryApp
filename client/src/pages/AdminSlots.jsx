import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";

export default function AdminSlots() {
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [max, setMax] = useState(5);

  useEffect(() => load(), []);

  async function load() {
    const { data } = await api.get("/admin/slots");
    setSlots(data.slots);
  }

  async function add() {
    await api.post("/admin/slots", { date, timeRange: time, maxOrders: max });
    load();
  }

  return (
    <AdminLayout title="Pickup/Delivery Slots">
      <Card>
        <h2>Add Slot</h2>
        <label>Date: <input type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
        <label>Time: <input type="time" value={time.split(":")[0]} onChange={e=>setTime(e.target.value+":00")} /></label>
        <label>Max Orders: <input type="number" value={max} onChange={e=>setMax(Number(e.target.value))} /></label>
        <button onClick={add}>Add</button>
      </Card>

      <h3>Existing Slots</h3>
      {slots.map(s => (
        <Card key={s._id}>
          <p>{new Date(s.date).toISOString().split("T")[0]} {s.timeRange} – booked {s.bookedCount}/{s.maxOrders}</p>
          {/* Edit / Delete buttons can be added here */}
        </Card>
      ))}
    </AdminLayout>
  );
}