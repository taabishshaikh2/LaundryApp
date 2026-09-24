import React, { useEffect, useState } from "react";
import api from "../api";
import RoleLayout from "../components/RoleLayout";

export default function PartnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  async function load() {
    const res = await api.get("/partner/orders");
    setOrders(res.data.orders);
  }

  useEffect(() => {
    load();
  }, []);

  async function markReady(orderId) {
    setUpdatingId(orderId);
    try {
      await api.put(`/partner/orders/${orderId}/status`, { status: "READY" });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function submitNote(orderId) {
    const text = (noteDrafts[orderId] || "").trim();
    if (!text) return;
    await api.post(`/partner/orders/${orderId}/notes`, { text });
    setNoteDrafts((d) => ({ ...d, [orderId]: "" }));
    await load();
  }

  const toProcess = orders.filter((o) => o.status === "PROCESSING");
  const others = orders.filter((o) => o.status !== "PROCESSING");

  return (
    <RoleLayout title="Laundry Partner" subtitle="Orders routed to your facility">
      <h2 className="font-semibold mb-3">To process ({toProcess.length})</h2>
      <div className="space-y-4 mb-8">
        {toProcess.map((o) => (
          <div key={o._id} className="border rounded-xl p-4 bg-white">
            <p className="font-semibold mb-1">#{o._id.slice(-6).toUpperCase()} · {o.userId?.name}</p>
            <p className="text-sm text-gray-500 mb-2">{o.serviceName} · {o.items.length} items</p>
            <ul className="text-sm text-gray-600 mb-3">
              {o.items.map((i, idx) => (
                <li key={idx}>{i.name} × {i.quantity} ({i.treatment.replaceAll("_", " ")})</li>
              ))}
            </ul>
            <button
              disabled={updatingId === o._id}
              onClick={() => markReady(o._id)}
              className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {updatingId === o._id ? "Updating…" : "Mark Ready"}
            </button>

            <div className="mt-3 flex gap-2">
              <input
                placeholder="Add a note (e.g. stain couldn't be removed)…"
                value={noteDrafts[o._id] || ""}
                onChange={(e) => setNoteDrafts((d) => ({ ...d, [o._id]: e.target.value }))}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
              />
              <button onClick={() => submitNote(o._id)} className="text-sm border rounded-lg px-3 py-1.5">
                Add
              </button>
            </div>
            {o.notes?.length > 0 && (
              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                {o.notes.map((n, idx) => (
                  <li key={idx}>📝 {n.text}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {toProcess.length === 0 && (
          <p className="text-gray-400 text-sm">Nothing waiting to be processed right now.</p>
        )}
      </div>

      {others.length > 0 && (
        <>
          <h2 className="font-semibold mb-3">Other assigned orders</h2>
          <div className="space-y-2">
            {others.map((o) => (
              <div key={o._id} className="border rounded-xl p-3 bg-white text-sm flex justify-between">
                <span>#{o._id.slice(-6).toUpperCase()} · {o.userId?.name}</span>
                <span className="text-gray-400">{o.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </RoleLayout>
  );
}
