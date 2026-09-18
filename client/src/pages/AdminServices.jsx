import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", icon: "🧺", description: "", priceMultiplier: 1 });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await api.get("/admin/services");
    setServices(res.data.services);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(s) {
    await api.put(`/admin/services/${s._id}`, { active: !s.active });
    await load();
  }

  async function handleDelete(s) {
    if (!window.confirm(`Remove the "${s.name}" service permanently?`)) return;
    await api.delete(`/admin/services/${s._id}`);
    await load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/admin/services", form);
      setForm({ name: "", code: "", icon: "🧺", description: "", priceMultiplier: 1 });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not add service");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout title="Laundry Options (Services)">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Price multiplier</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="p-3">{s.icon} {s.name}</td>
                    <td className="p-3 text-xs text-gray-500">{s.code}</td>
                    <td className="p-3">×{s.priceMultiplier}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(s)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          s.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {s.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(s)} className="text-red-600 text-xs underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">No services yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Price multiplier is applied on top of each garment's base price — e.g. Ironing at ×0.6 is cheaper
            than the base wash price, Dry Cleaning at ×1.8 is pricier.
          </p>
        </div>

        <div className="border rounded-xl p-4 bg-white h-fit">
          <p className="font-semibold mb-3">Add a laundry option</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              placeholder="Name (e.g. Steam Ironing)"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Code (e.g. STEAM_IRONING)"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Icon (emoji)"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Short description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <div>
              <label className="text-xs text-gray-500">Price multiplier (vs. base garment price)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.priceMultiplier}
                onChange={(e) => setForm((f) => ({ ...f, priceMultiplier: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add service"}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
