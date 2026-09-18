import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

const CATEGORIES = ["MEN", "WOMEN", "KIDS", "HOUSEHOLD"];

export default function AdminPricing() {
  const [garments, setGarments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [newGarment, setNewGarment] = useState({ category: "MEN", name: "", icon: "👕", priceRegular: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get("/admin/garments");
    setGarments(res.data.garments);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(g) {
    setEditingId(g._id);
    setEditPrice(String(g.priceRegular));
  }

  async function saveEdit(id) {
    await api.put(`/admin/garments/${id}`, { priceRegular: Number(editPrice) });
    setEditingId(null);
    await load();
  }

  async function toggleActive(g) {
    await api.put(`/admin/garments/${g._id}`, { active: !g.active });
    await load();
  }

  async function handleDelete(g) {
    if (!window.confirm(`Remove "${g.name}" permanently? This can't be undone.`)) return;
    await api.delete(`/admin/garments/${g._id}`);
    await load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/garments", {
        ...newGarment,
        priceRegular: Number(newGarment.priceRegular),
      });
      setNewGarment({ category: "MEN", name: "", icon: "👕", priceRegular: "" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not add garment");
    }
  }

  return (
    <AdminLayout title="Services & Pricing">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price (Regular)</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {garments.map((g) => (
                  <tr key={g._id} className="border-t">
                    <td className="p-3">{g.icon} {g.name}</td>
                    <td className="p-3 text-xs text-gray-500">{g.category}</td>
                    <td className="p-3">
                      {editingId === g._id ? (
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20 border rounded px-2 py-1"
                        />
                      ) : (
                        `₹${g.priceRegular}`
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(g)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          g.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {g.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3">
                      {editingId === g._id ? (
                        <button onClick={() => saveEdit(g._id)} className="text-brand-600 text-xs underline">
                          Save
                        </button>
                      ) : (
                        <div className="flex gap-3">
                          <button onClick={() => startEdit(g)} className="text-gray-500 text-xs underline">
                            Edit price
                          </button>
                          <button onClick={() => handleDelete(g)} className="text-red-600 text-xs underline">
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {garments.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">No garments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white h-fit">
          <p className="font-semibold mb-3">Add a garment</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <select
              value={newGarment.category}
              onChange={(e) => setNewGarment((f) => ({ ...f, category: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="Item name"
              required
              value={newGarment.name}
              onChange={(e) => setNewGarment((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Icon (emoji)"
              value={newGarment.icon}
              onChange={(e) => setNewGarment((f) => ({ ...f, icon: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Price (₹)"
              required
              value={newGarment.priceRegular}
              onChange={(e) => setNewGarment((f) => ({ ...f, priceRegular: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold"
            >
              Add item
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
