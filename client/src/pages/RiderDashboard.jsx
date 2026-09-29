import React, { useEffect, useState } from "react";
import api from "../api";
import RoleLayout from "../components/RoleLayout";
const NEXT_ACTION = {
  PICKUP_ASSIGNED: {
    status: "RIDER_ON_THE_WAY",
    label: "Mark On The Way"
  },
  RIDER_ON_THE_WAY: {
    status: "PICKED_UP",
    label: "Mark Picked Up"
  },
  READY: {
    status: "OUT_FOR_DELIVERY",
    label: "Mark Out for Delivery"
  },
  OUT_FOR_DELIVERY: {
    status: "DELIVERED",
    label: "Mark Delivered"
  }
};
const WAITING_TEXT = {
  PICKED_UP: "Waiting for laundry partner to start processing…",
  PROCESSING: "Being processed by the laundry partner…"
};
export default function RiderDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  async function load() {
    try {
      const res = await api.get("/rider/orders");
      setOrders(res.data.orders);
      setError("");
    } catch {
      setError("Could not load assigned orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function advance(orderId, status) {
    setUpdatingId(orderId);
    try {
      await api.put(`/rider/orders/${orderId}/status`, {
        status
      });
      await load();
    } catch {
      setError("Could not update this order. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }
  async function submitNote(orderId) {
    try {
      const text = (noteDrafts[orderId] || "").trim();
      if (!text) return;
      await api.post(`/rider/orders/${orderId}/notes`, {
        text
      });
      setNoteDrafts(d => ({
        ...d,
        [orderId]: ""
      }));
      await load();
    } catch {
      setError("Could not save your note. Please try again.");
    }
  }
  const activeOrders = orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status));
  const pastOrders = orders.filter(o => ["DELIVERED", "CANCELLED"].includes(o.status));
  return <RoleLayout title="Rider" subtitle="Your assigned pickups & deliveries">
      {error && <div className="dg-error" role="alert">{error} <button onClick={load} className="underline">Retry</button></div>}
      {loading && <p role="status" className="dg-empty">Loading your assignments…</p>}
      <h2 className="font-semibold mb-3">Active ({activeOrders.length})</h2>
      <div className="space-y-4 mb-8">
        {activeOrders.map(o => {
        const action = NEXT_ACTION[o.status];
        const waiting = WAITING_TEXT[o.status];
        return <div key={o._id} className="border rounded-xl p-4 bg-white">
              <div className="flex justify-between mb-2">
                <div>
                  <p className="font-semibold">#{o._id.slice(-6).toUpperCase()} · {o.userId?.name}</p>
                  <p className="text-sm text-gray-500">
                    {o.address?.line1}{o.address?.landmark ? `, ${o.address.landmark}` : ""}
                  </p>
                </div>
                {o.userId?.phone && <a href={`tel:${o.userId.phone}`} className="text-sm text-brand-600 font-medium shrink-0">
                    📞 Call
                  </a>}
              </div>
              <p className="text-xs uppercase text-brand-600 font-semibold mb-2">{o.status.replaceAll("_", " ")}</p>
{o.deliveryMethod && <p className="text-xs text-gray-600">Delivery: {o.deliveryMethod}</p>}

              {action && <button disabled={updatingId === o._id} onClick={() => advance(o._id, action.status)} className="bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
                  {updatingId === o._id ? "Updating…" : action.label}
                </button>}
              {!action && waiting && <p className="text-sm text-gray-400 italic">{waiting}</p>}

              <div className="mt-3 flex gap-2">
                <input aria-label="Order note" placeholder="Add a note (e.g. gate code, issue)…" value={noteDrafts[o._id] || ""} onChange={e => setNoteDrafts(d => ({
              ...d,
              [o._id]: e.target.value
            }))} className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
                <button onClick={() => submitNote(o._id)} className="text-sm border rounded-lg px-3 py-1.5">
                  Add
                </button>
              </div>
              {o.notes?.length > 0 && <ul className="mt-2 text-xs text-gray-500 space-y-1">
                  {o.notes.map((n, idx) => <li key={idx}>📝 {n.text}</li>)}
                </ul>}
            </div>;
      })}
        {!loading && !error && activeOrders.length === 0 && <p className="text-gray-400 text-sm">No active pickups or deliveries assigned right now.</p>}
      </div>

      {pastOrders.length > 0 && <>
          {error && <div className="dg-error" role="alert">{error} <button onClick={load} className="underline">Retry</button></div>}
      {loading && <p role="status" className="dg-empty">Loading your assignments…</p>}
      <h2 className="font-semibold mb-3">Completed</h2>
          <div className="space-y-2">
            {pastOrders.map(o => <div key={o._id} className="border rounded-xl p-3 bg-white text-sm flex justify-between">
                <span>#{o._id.slice(-6).toUpperCase()} · {o.userId?.name}</span>
                <span className="text-gray-400">{o.status.replaceAll("_", " ")}</span>
              </div>)}
          </div>
        </>}
    </RoleLayout>;
}
