import React, { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

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
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      const [ordersRes, ridersRes, partnersRes] = await Promise.all([
        api.get("/orders/admin/all"),
        api.get("/admin/riders"),
        api.get("/admin/laundry-partners"),
      ]);
      setOrders(ordersRes.data.orders);
      setRiders(ridersRes.data.riders);
      setPartners(partnersRes.data.partners);
    } catch (err) {
      showError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(orderId, status) {
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status });
      showSuccess("Status updated");
      await load();
    } catch (err) {
      showError("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignRider(orderId, riderId) {
    if (!riderId) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/assign-rider`, { riderId });
      showSuccess("Rider assigned");
      await load();
    } catch (err) {
      showError("Failed to assign rider");
    } finally {
      setUpdatingId(null);
    }
  }

  async function assignPartner(orderId, partnerId) {
    if (!partnerId) return;
    setUpdatingId(orderId);
    try {
      await api.put(`/orders/admin/${orderId}/assign-partner`, { partnerId });
      showSuccess("Partner assigned");
      await load();
    } catch (err) {
      showError("Failed to assign partner");
    } finally {
      setUpdatingId(null);
    }
  }

  const getStatusVariant = (status) => {
    if (status === "DELIVERED") return "success";
    if (status === "CANCELLED") return "error";
    if (status === "ORDER_PLACED" || status === "PICKUP_ASSIGNED") return "warning";
    return "info";
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o._id.toLowerCase().includes(q) ||
      o.userId?.name?.toLowerCase().includes(q) ||
      o.userId?.phone?.includes(q)
    );
  });

  if (loading) {
    return (
      <AdminLayout title="Orders">
        <Skeleton variant="card" count={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders">
      <div className="animate-fade-in space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by order ID, customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pr-10 rounded-card border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-smooth"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <EmptyState
              icon="📦"
              title="No orders found"
              description={searchQuery ? "Try a different search" : "No orders yet"}
            />
          </Card>
        ) : (
          <>
            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden lg:block border rounded-card overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-3 font-semibold">Order</th>
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 font-semibold">Service</th>
                      <th className="p-3 font-semibold">Items</th>
                      <th className="p-3 font-semibold">Total</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Rider</th>
                      <th className="p-3 font-semibold">Partner</th>
                      <th className="p-3 font-semibold">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o) => (
                      <React.Fragment key={o._id}>
                        <tr className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">#{o._id.slice(-6).toUpperCase()}</td>
                          <td className="p-3">
                            {o.userId?.name}
                            <br />
                            <span className="text-xs text-gray-500">{o.userId?.phone}</span>
                          </td>
                          <td className="p-3 text-xs">{o.serviceName || "—"}</td>
                          <td className="p-3">{o.items.length}</td>
                          <td className="p-3 font-semibold">₹{o.total}</td>
                          <td className="p-3">
                            <select
                              value={o.status}
                              disabled={updatingId === o._id}
                              onChange={(e) => updateStatus(o._id, e.target.value)}
                              className="border rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500"
                            >
                              {STATUS_LIST.map((s) => (
                                <option key={s} value={s}>
                                  {s.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              value={o.riderId?._id || ""}
                              disabled={updatingId === o._id}
                              onChange={(e) => assignRider(o._id, e.target.value)}
                              className="border rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="">Unassigned</option>
                              {riders.map((r) => (
                                <option key={r._id} value={r._id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <select
                              value={o.partnerId?._id || ""}
                              disabled={updatingId === o._id}
                              onChange={(e) => assignPartner(o._id, e.target.value)}
                              className="border rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="">Unassigned</option>
                              {partners.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.businessName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                              className="text-brand-600 text-xs underline hover:text-brand-700"
                            >
                              {expandedId === o._id ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>
                        {expandedId === o._id && (
                          <tr className="border-t bg-gray-50">
                            <td colSpan={9} className="p-4">
                              <p className="font-semibold text-xs uppercase text-gray-500 mb-2">
                                Status history
                              </p>
                              <ul className="space-y-1 text-sm mb-4">
                                {o.statusHistory.map((h, idx) => (
                                  <li key={idx} className="flex justify-between gap-4">
                                    <span>
                                      {h.previousStatus ? h.previousStatus.replaceAll("_", " ") : "—"} →{" "}
                                      <strong>{h.newStatus.replaceAll("_", " ")}</strong> ({h.changedByRole})
                                    </span>
                                    <span className="text-gray-500 text-xs whitespace-nowrap">
                                      {new Date(h.timestamp).toLocaleString()}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {o.notes?.length > 0 && (
                                <>
                                  <p className="font-semibold text-xs uppercase text-gray-500 mb-2">Notes</p>
                                  <ul className="space-y-1 text-sm">
                                    {o.notes.map((n, idx) => (
                                      <li key={idx} className="flex justify-between gap-4">
                                        <span>
                                          📝 {n.text} <span className="text-gray-500">({n.addedByRole})</span>
                                        </span>
                                        <span className="text-gray-500 text-xs whitespace-nowrap">
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards - Shown on mobile */}
            <div className="lg:hidden space-y-3">
              {filteredOrders.map((o) => (
                <Card key={o._id} variant="default" padding="default">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">#{o._id.slice(-6).toUpperCase()}</p>
                        <p className="text-sm text-gray-600">{o.userId?.name}</p>
                        <p className="text-xs text-gray-500">{o.userId?.phone}</p>
                      </div>
                      <Badge variant={getStatusVariant(o.status)}>
                        {o.status.replaceAll("_", " ")}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Service</p>
                        <p className="font-medium">{o.serviceName || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Items</p>
                        <p className="font-medium">{o.items.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="font-bold text-brand-700">₹{o.total}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="font-medium text-xs">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Update Status</label>
                        <select
                          value={o.status}
                          disabled={updatingId === o._id}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                        >
                          {STATUS_LIST.map((s) => (
                            <option key={s} value={s}>
                              {s.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Assign Rider</label>
                        <select
                          value={o.riderId?._id || ""}
                          disabled={updatingId === o._id}
                          onChange={(e) => assignRider(o._id, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Unassigned</option>
                          {riders.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 block mb-1">Assign Partner</label>
                        <select
                          value={o.partnerId?._id || ""}
                          disabled={updatingId === o._id}
                          onChange={(e) => assignPartner(o._id, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">Unassigned</option>
                          {partners.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.businessName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                        className="w-full text-center text-brand-600 text-sm font-medium py-2 hover:bg-brand-50 rounded-lg transition-smooth"
                      >
                        {expandedId === o._id ? "Hide History" : "View History"}
                      </button>
                    </div>

                    {/* Expanded History - Mobile */}
                    {expandedId === o._id && (
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        <div>
                          <p className="font-semibold text-xs uppercase text-gray-500 mb-2">Status History</p>
                          <div className="space-y-2">
                            {o.statusHistory.map((h, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                <p className="font-medium">
                                  {h.previousStatus ? h.previousStatus.replaceAll("_", " ") : "—"} →{" "}
                                  <strong>{h.newStatus.replaceAll("_", " ")}</strong>
                                </p>
                                <p className="text-gray-500 mt-1">
                                  {h.changedByRole} • {new Date(h.timestamp).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {o.notes?.length > 0 && (
                          <div>
                            <p className="font-semibold text-xs uppercase text-gray-500 mb-2">Notes</p>
                            <div className="space-y-2">
                              {o.notes.map((n, idx) => (
                                <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                                  <p>📝 {n.text}</p>
                                  <p className="text-gray-500 mt-1">
                                    {n.addedByRole} • {new Date(n.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
