import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminLaundryPartners() {
  const [partners, setPartners] = useState([]);
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await api.get("/admin/laundry-partners");
    setPartners(res.data.partners);
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function toggleActive(p) {
    await api.put(`/admin/laundry-partners/${p._id}`, { active: !p.active });
    await load();
  }

  async function handleDelete(p) {
    if (!window.confirm(`Remove "${p.businessName}" and its login account? This can't be undone.`)) return;
    await api.delete(`/admin/laundry-partners/${p._id}`);
    await load();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/admin/laundry-partners", form);
      setForm({ businessName: "", contactName: "", email: "", phone: "", password: "", address: "" });
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
                  <th className="p-3">Business</th>
                  <th className="p-3">Login</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Address</th>
                  <th className="p-3">Active</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="p-3 font-medium">{p.businessName}</td>
                    <td className="p-3 text-xs text-gray-500">{p.userId?.email || "—"}</td>
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
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">No laundry partners yet</td></tr>
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
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Contact person's name"
              required
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Login email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Phone"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Temporary password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add partner + create login"}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
