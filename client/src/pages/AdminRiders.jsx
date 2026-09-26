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

export default function AdminRiders() {
  const { showSuccess, showError } = useToast();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  async function load() {
    try {
      const res = await api.get("/admin/riders");
      setRiders(res.data.riders);
    } catch (err) {
      showError("Failed to load riders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/riders", form);
      setForm({ name: "", email: "", phone: "", password: "" });
      showSuccess("Rider added successfully!");
      await load();
    } catch (err) {
      showError(err?.response?.data?.error || "Could not create rider");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRiders = riders.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.phone?.includes(q)
    );
  });

  if (loading) {
    return (
      <AdminLayout title="Riders">
        <Skeleton variant="card" count={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Riders">
      <div className="animate-fade-in space-y-4">
        {/* Mobile: Add Form First, Desktop: Form on Right */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Rider Form */}
          <Card variant="elevated" padding="lg" className="lg:order-2">
            <h2 className="text-heading-4 mb-4">Add a Rider</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                placeholder="rider@example.com"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="+91 9876543210"
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="At least 8 characters"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <Button type="submit" variant="primary" loading={submitting} className="w-full">
                Add Rider
              </Button>
            </form>
          </Card>

          {/* Riders List */}
          <div className="lg:col-span-2 lg:order-1 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-card border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-smooth"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            {filteredRiders.length === 0 ? (
              <Card>
                <EmptyState
                  icon="🚴"
                  title="No riders found"
                  description={searchQuery ? "Try a different search" : "No riders yet"}
                />
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block border rounded-card overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="p-3 font-semibold">Name</th>
                        <th className="p-3 font-semibold">Email</th>
                        <th className="p-3 font-semibold">Phone</th>
                        <th className="p-3 font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRiders.map((r) => (
                        <tr key={r._id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium">{r.name}</td>
                          <td className="p-3 text-gray-600">{r.email}</td>
                          <td className="p-3 text-gray-600">{r.phone}</td>
                          <td className="p-3 text-xs text-gray-500">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {filteredRiders.map((r) => (
                    <Card key={r._id} variant="default" padding="default">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{r.name}</p>
                          <p className="text-sm text-gray-600">{r.email}</p>
                          <p className="text-sm text-gray-600">{r.phone}</p>
                        </div>
                        <Badge variant="info">Active</Badge>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Joined {new Date(r.createdAt).toLocaleDateString()}
                        </p>
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
