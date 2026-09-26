import React, { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

const CATEGORIES = ["MEN", "WOMEN", "KIDS", "HOUSEHOLD"];

export default function AdminPricing() {
  const { showSuccess, showError } = useToast();
  const [garments, setGarments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editPrices, setEditPrices] = useState({});
  const [newGarment, setNewGarment] = useState({
    category: "MEN",
    name: "",
    icon: "👕",
    washingPrice: "",
    dryCleaningPrice: "",
    ironingRegularPrice: "",
    ironingExpressPrice: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");

  async function load() {
    try {
      const res = await api.get("/admin/garments");
      setGarments(res.data.garments);
    } catch (err) {
      showError("Failed to load garments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(g) {
    setEditingId(g._id);
    setEditPrices({
      washingPrice: g.washingPrice || 0,
      dryCleaningPrice: g.dryCleaningPrice || 0,
      ironingRegularPrice: g.ironingRegularPrice || 0,
      ironingExpressPrice: g.ironingExpressPrice || 0,
    });
  }

  async function saveEdit(id) {
    try {
      await api.put(`/admin/garments/${id}`, {
        washingPrice: Number(editPrices.washingPrice) || 0,
        dryCleaningPrice: Number(editPrices.dryCleaningPrice) || 0,
        ironingRegularPrice: Number(editPrices.ironingRegularPrice) || 0,
        ironingExpressPrice: Number(editPrices.ironingExpressPrice) || 0,
      });
      setEditingId(null);
      showSuccess("Prices updated!");
      await load();
    } catch (err) {
      showError("Failed to update prices");
    }
  }

  async function toggleActive(g) {
    try {
      await api.put(`/admin/garments/${g._id}`, { active: !g.active });
      showSuccess(g.active ? "Garment deactivated" : "Garment activated");
      await load();
    } catch (err) {
      showError("Failed to toggle status");
    }
  }

  async function handleDelete(g) {
    if (!window.confirm(`Remove "${g.name}" permanently? This can't be undone.`)) return;
    try {
      await api.delete(`/admin/garments/${g._id}`);
      showSuccess("Garment removed");
      await load();
    } catch (err) {
      showError("Failed to remove garment");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/garments", {
        ...newGarment,
        washingPrice: Number(newGarment.washingPrice) || 0,
        dryCleaningPrice: Number(newGarment.dryCleaningPrice) || 0,
        ironingRegularPrice: Number(newGarment.ironingRegularPrice) || 0,
        ironingExpressPrice: Number(newGarment.ironingExpressPrice) || 0,
      });
      setNewGarment({
        category: "MEN",
        name: "",
        icon: "👕",
        washingPrice: "",
        dryCleaningPrice: "",
        ironingRegularPrice: "",
        ironingExpressPrice: "",
      });
      showSuccess("Garment added successfully!");
      await load();
    } catch (err) {
      showError(err?.response?.data?.error || "Could not add garment");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredGarments = garments.filter((g) => {
    if (filterCategory === "ALL") return true;
    return g.category === filterCategory;
  });

  if (loading) {
    return (
      <AdminLayout title="Garments & Pricing">
        <Skeleton variant="card" count={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Garments & Pricing">
      <div className="animate-fade-in space-y-4">
        {/* Info Card */}
        <Card variant="default" className="bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">New Flat Pricing Model</p>
              <p className="text-sm text-blue-800">
                Set individual prices for each service. Leave at 0 if a garment doesn't offer that
                service. Express is available for Ironing only (1 hour delivery).
              </p>
            </div>
          </div>
        </Card>

        {/* Mobile: Add Form First, Desktop: Form on Right */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Garment Form */}
          <Card variant="elevated" padding="lg" className="lg:order-2">
            <h2 className="text-heading-4 mb-4">Add a Garment</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                <select
                  value={newGarment.category}
                  onChange={(e) => setNewGarment((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Item Name"
                placeholder="T-Shirt"
                required
                value={newGarment.name}
                onChange={(e) => setNewGarment((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Icon (Emoji)"
                placeholder="👕"
                value={newGarment.icon}
                onChange={(e) => setNewGarment((f) => ({ ...f, icon: e.target.value }))}
              />

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Service Prices (₹)</p>
                <div className="space-y-3">
                  <Input
                    label="Washing (24-48hrs)"
                    type="number"
                    placeholder="40"
                    value={newGarment.washingPrice}
                    onChange={(e) =>
                      setNewGarment((f) => ({ ...f, washingPrice: e.target.value }))
                    }
                  />
                  <Input
                    label="Dry Cleaning (24-48hrs)"
                    type="number"
                    placeholder="72"
                    value={newGarment.dryCleaningPrice}
                    onChange={(e) =>
                      setNewGarment((f) => ({ ...f, dryCleaningPrice: e.target.value }))
                    }
                  />
                  <Input
                    label="Ironing Regular (24-48hrs)"
                    type="number"
                    placeholder="24"
                    value={newGarment.ironingRegularPrice}
                    onChange={(e) =>
                      setNewGarment((f) => ({ ...f, ironingRegularPrice: e.target.value }))
                    }
                  />
                  <Input
                    label="Ironing Express (1hr)"
                    type="number"
                    placeholder="50"
                    value={newGarment.ironingExpressPrice}
                    onChange={(e) =>
                      setNewGarment((f) => ({ ...f, ironingExpressPrice: e.target.value }))
                    }
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Leave at 0 if not offered</p>
              </div>

              <Button type="submit" variant="primary" loading={submitting} className="w-full">
                Add Garment
              </Button>
            </form>
          </Card>

          {/* Garments List */}
          <div className="lg:col-span-2 lg:order-1 space-y-4">
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {["ALL", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-button text-sm font-medium transition-smooth ${
                    filterCategory === cat
                      ? "bg-brand-600 text-white shadow-card"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-brand-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredGarments.length === 0 ? (
              <Card>
                <EmptyState
                  icon="👔"
                  title="No garments found"
                  description={
                    filterCategory !== "ALL" ? `No ${filterCategory} items` : "No garments yet"
                  }
                />
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block border rounded-card overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left">
                        <tr>
                          <th className="p-3 font-semibold">Item</th>
                          <th className="p-3 font-semibold">Washing</th>
                          <th className="p-3 font-semibold">Dry Clean</th>
                          <th className="p-3 font-semibold">Iron (Reg)</th>
                          <th className="p-3 font-semibold">Iron (Exp)</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGarments.map((g) => (
                          <tr key={g._id} className="border-t hover:bg-gray-50">
                            <td className="p-3">
                              <span className="mr-2">{g.icon}</span>
                              <span className="font-medium">{g.name}</span>
                              <Badge variant="neutral" className="ml-2">
                                {g.category}
                              </Badge>
                            </td>
                            {editingId === g._id ? (
                              <>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={editPrices.washingPrice}
                                    onChange={(e) =>
                                      setEditPrices((p) => ({ ...p, washingPrice: e.target.value }))
                                    }
                                    className="w-20 border rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={editPrices.dryCleaningPrice}
                                    onChange={(e) =>
                                      setEditPrices((p) => ({
                                        ...p,
                                        dryCleaningPrice: e.target.value,
                                      }))
                                    }
                                    className="w-20 border rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={editPrices.ironingRegularPrice}
                                    onChange={(e) =>
                                      setEditPrices((p) => ({
                                        ...p,
                                        ironingRegularPrice: e.target.value,
                                      }))
                                    }
                                    className="w-20 border rounded px-2 py-1 text-sm"
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    value={editPrices.ironingExpressPrice}
                                    onChange={(e) =>
                                      setEditPrices((p) => ({
                                        ...p,
                                        ironingExpressPrice: e.target.value,
                                      }))
                                    }
                                    className="w-20 border rounded px-2 py-1 text-sm"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-semibold">
                                  {g.washingPrice > 0 ? `₹${g.washingPrice}` : "—"}
                                </td>
                                <td className="p-3 font-semibold">
                                  {g.dryCleaningPrice > 0 ? `₹${g.dryCleaningPrice}` : "—"}
                                </td>
                                <td className="p-3 font-semibold">
                                  {g.ironingRegularPrice > 0 ? `₹${g.ironingRegularPrice}` : "—"}
                                </td>
                                <td className="p-3 font-semibold">
                                  {g.ironingExpressPrice > 0 ? `₹${g.ironingExpressPrice}` : "—"}
                                </td>
                              </>
                            )}
                            <td className="p-3">
                              <button
                                onClick={() => toggleActive(g)}
                                className={`text-xs px-3 py-1 rounded-full font-medium transition-smooth ${
                                  g.active
                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {g.active ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="p-3">
                              {editingId === g._id ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveEdit(g._id)}
                                    className="text-brand-600 text-xs underline hover:text-brand-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="text-gray-500 text-xs underline hover:text-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => startEdit(g)}
                                    className="text-gray-600 text-xs underline hover:text-gray-800"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(g)}
                                    className="text-red-600 text-xs underline hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {filteredGarments.map((g) => (
                    <Card key={g._id} variant="default" padding="default">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-lg">
                            {g.icon} {g.name}
                          </p>
                          <Badge variant="neutral" className="mt-1">
                            {g.category}
                          </Badge>
                        </div>
                        <button
                          onClick={() => toggleActive(g)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-smooth ${
                            g.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {g.active ? "Active" : "Inactive"}
                        </button>
                      </div>

                      {editingId === g._id ? (
                        <div className="space-y-3 mb-3">
                          <Input
                            label="Washing"
                            type="number"
                            value={editPrices.washingPrice}
                            onChange={(e) =>
                              setEditPrices((p) => ({ ...p, washingPrice: e.target.value }))
                            }
                          />
                          <Input
                            label="Dry Cleaning"
                            type="number"
                            value={editPrices.dryCleaningPrice}
                            onChange={(e) =>
                              setEditPrices((p) => ({ ...p, dryCleaningPrice: e.target.value }))
                            }
                          />
                          <Input
                            label="Ironing (Regular)"
                            type="number"
                            value={editPrices.ironingRegularPrice}
                            onChange={(e) =>
                              setEditPrices((p) => ({ ...p, ironingRegularPrice: e.target.value }))
                            }
                          />
                          <Input
                            label="Ironing (Express)"
                            type="number"
                            value={editPrices.ironingExpressPrice}
                            onChange={(e) =>
                              setEditPrices((p) => ({ ...p, ironingExpressPrice: e.target.value }))
                            }
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-gray-100">
                          <div>
                            <p className="text-xs text-gray-600">Washing</p>
                            <p className="font-bold text-brand-700">
                              {g.washingPrice > 0 ? `₹${g.washingPrice}` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Dry Clean</p>
                            <p className="font-bold text-brand-700">
                              {g.dryCleaningPrice > 0 ? `₹${g.dryCleaningPrice}` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Iron (Regular)</p>
                            <p className="font-bold text-brand-700">
                              {g.ironingRegularPrice > 0 ? `₹${g.ironingRegularPrice}` : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Iron (Express)</p>
                            <p className="font-bold text-brand-700">
                              {g.ironingExpressPrice > 0 ? `₹${g.ironingExpressPrice}` : "—"}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {editingId === g._id ? (
                          <>
                            <button
                              onClick={() => saveEdit(g._id)}
                              className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-smooth"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-smooth"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(g)}
                              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-smooth"
                            >
                              Edit Prices
                            </button>
                            <button
                              onClick={() => handleDelete(g)}
                              className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-smooth"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
