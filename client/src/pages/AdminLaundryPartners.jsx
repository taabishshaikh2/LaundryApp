import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminLaundryPartners() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await api.get("/admin/laundry-partners");
    setPartners(res.data.partners);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(p) {
    await api.put(`/admin/laundry-partners/${p._id}`, { active: !p.active });
    await load();
  }

  async function handleDelete(p) {
    if (!window.confirm(`Remove "${p.name}" as a laundry partner?`)) return;
    await api.delete(`/admin/laundry-partners/${p._id}`);
    await load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/admin/laundry-partners", form);
      setForm({ name: "", phone: "", address: "" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not add laundry partner");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout title="Laundry Partners">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.phone}</td>
                    <td className="p-3 text-xs text-gray-500">{p.address}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2 py-1 rounded-full ${
                          p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleDelete(p)} className="text-red-600 text-xs underline">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {partners.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-gray-400">No laundry partners yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white h-fit">
          <p className="font-semibold mb-3">Add a laundry partner</p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              placeholder="Business name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add partner"}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
