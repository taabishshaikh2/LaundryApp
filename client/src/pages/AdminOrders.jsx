import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

const STATUS_LIST = [
  "ORDER_PLACED",
  "PICKUP_ASSIGNED",
  "RIDER_ON_THE_WAY",
  "PICKED_UP",
  "PROCESSING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    const [ordersRes, ridersRes, partnersRes] = await Promise.all([
      api.get("/orders/admin/all"),
      api.get("/admin/riders"),
      api.get("/admin/laundry-partners"),
    ]);
    setOrders(ordersRes.data.orders);
    setRiders(ridersRes.data.riders);
    setPartners(partnersRes.data.partners);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId, status) {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignRider(orderId, riderId) {
    if (!riderId) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/assign-rider`, { riderId });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignPartner(orderId, partnerId) {
    if (!partnerId) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/assign-partner`, { partnerId });
      await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <AdminLayout title="Orders">
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Service</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Rider</th>
              <th className="p-3">Partner</th>
              <th className="p-3">History</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <React.Fragment key={o._id}>
                <tr className="border-t">
                  <td className="p-3 font-medium">#{o._id.slice(-6).toUpperCase()}</td>
                  <td className="p-3">
                    {o.userId?.name}
                    <br />
                    <span className="text-xs text-gray-400">{o.userId?.phone}</span>
                  </td>
                  <td className="p-3 text-xs">{o.serviceName || "—"}</td>
                  <td className="p-3">{o.items.length}</td>
                  <td className="p-3">₹{o.total}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      disabled={updatingId === o._id}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                      className="border rounded-lg px-2 py-1"
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={o.riderId?._id || ""}
                      disabled={updatingId === o._id}
                      onChange={(e) => assignRider(o._id, e.target.value)}
                      className="border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {riders.map((r) => (
                        <option key={r._id} value={r._id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={o.partnerId?._id || ""}
                      disabled={updatingId === o._id}
                      onChange={(e) => assignPartner(o._id, e.target.value)}
                      className="border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {partners.map((p) => (
                        <option key={p._id} value={p._id}>{p.businessName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                      className="text-brand-600 text-xs underline"
                    >
                      {expandedId === o._id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {expandedId === o._id && (
                  <tr className="border-t bg-gray-50">
                    <td colSpan={9} className="p-4">
                      <p className="font-semibold text-xs uppercase text-gray-400 mb-2">Status history</p>
                      <ul className="space-y-1 text-sm mb-4">
                        {o.statusHistory.map((h, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>
                              {h.previousStatus ? h.previousStatus.replaceAll("_", " ") : "—"} →{" "}
                              <strong>{h.newStatus.replaceAll("_", " ")}</strong> ({h.changedByRole})
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {o.notes?.length > 0 && (
                        <>
                          <p className="font-semibold text-xs uppercase text-gray-400 mb-2">Notes</p>
                          <ul className="space-y-1 text-sm">
                            {o.notes.map((n, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>📝 {n.text} <span className="text-gray-400">({n.addedByRole})</span></span>
                                <span className="text-gray-400 text-xs">
                                  {new Date(n.timestamp).toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">No orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
