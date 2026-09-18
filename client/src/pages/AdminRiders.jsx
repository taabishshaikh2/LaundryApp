import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminRiders() {
  const [riders, setRiders] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await api.get("/admin/riders");
    setRiders(res.data.riders);
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/admin/riders", form);
      setForm({ name: "", email: "", phone: "", password: "" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Could not create rider");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout title="Riders">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.email}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {riders.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-400">No riders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white h-fit">
          <p className="font-semibold mb-3">Add a rider</p>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              placeholder="Full name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
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
              {submitting ? "Adding…" : "Add rider"}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
