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

export default function AdminServices() {
  const { showSuccess, showError } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    code: "",
    icon: "🧺",
    description: "",
    priceMultiplier: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await api.get("/admin/services");
      setServices(res.data.services);
    } catch (err) {
      showError("Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(s) {
    try {
      await api.put(`/admin/services/${s._id}`, { active: !s.active });
      showSuccess(s.active ? "Service deactivated" : "Service activated");
      await load();
    } catch (err) {
      showError("Failed to toggle status");
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`Remove the "${s.name}" service permanently?`)) return;
    try {
      await api.delete(`/admin/services/${s._id}`);
      showSuccess("Service removed");
      await load();
    } catch (err) {
      showError("Failed to remove service");
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admin/services", form);
      setForm({ name: "", code: "", icon: "🧺", description: "", priceMultiplier: 1 });
      showSuccess("Service added successfully!");
      await load();
    } catch (err) {
      showError(err?.response?.data?.error || "Could not add service");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Laundry Services">
        <Skeleton variant="card" count={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Laundry Services">
      <div className="animate-fade-in space-y-4">
        {/* Info Card */}
        <Card variant="default" className="bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-900 mb-1">About Price Multiplier</p>
              <p className="text-sm text-blue-800">
                Price multiplier is applied on top of each garment's base price. For example:
                <br />• Ironing at <strong>×0.6</strong> = 60% of base price (cheaper)
                <br />• Dry Cleaning at <strong>×1.8</strong> = 180% of base price (premium)
              </p>
            </div>
          </div>
        </Card>

        {/* Mobile: Add Form First, Desktop: Form on Right */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Service Form */}
          <Card variant="elevated" padding="lg" className="lg:order-2">
            <h2 className="text-heading-4 mb-4">Add a Service</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label="Service Name"
                placeholder="e.g. Steam Ironing"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Code"
                placeholder="e.g. STEAM_IRONING"
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
              <Input
                label="Icon (Emoji)"
                placeholder="🧺"
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
              <Input
                label="Description"
                placeholder="Short description of the service"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Price Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.priceMultiplier}
                  onChange={(e) => setForm((f) => ({ ...f, priceMultiplier: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Applied to garment base price (e.g., 0.6 for 60%, 1.8 for 180%)
                </p>
              </div>
              <Button type="submit" variant="primary" loading={submitting} className="w-full">
                Add Service
              </Button>
            </form>
          </Card>

          {/* Services List */}
          <div className="lg:col-span-2 lg:order-1 space-y-4">
            {services.length === 0 ? (
              <Card>
                <EmptyState
                  icon="🧺"
                  title="No services found"
                  description="Add your first laundry service"
                />
              </Card>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block border rounded-card overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="p-3 font-semibold">Service</th>
                        <th className="p-3 font-semibold">Code</th>
                        <th className="p-3 font-semibold">Multiplier</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s._id} className="border-t hover:bg-gray-50">
                          <td className="p-3">
                            <span className="mr-2 text-xl">{s.icon}</span>
                            <span className="font-medium">{s.name}</span>
                            {s.description && (
                              <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                            )}
                          </td>
                          <td className="p-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{s.code}</code>
                          </td>
                          <td className="p-3 font-bold text-brand-700">×{s.priceMultiplier}</td>
                          <td className="p-3">
                            <button
                              onClick={() => toggleActive(s)}
                              className={`text-xs px-3 py-1 rounded-full font-medium transition-smooth ${
                                s.active
                                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {s.active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDelete(s)}
                              className="text-red-600 text-xs underline hover:text-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {services.map((s) => (
                    <Card key={s._id} variant="default" padding="default">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-lg">
                            {s.icon} {s.name}
                          </p>
                          {s.description && (
                            <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                          )}
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded inline-block mt-2">
                            {s.code}
                          </code>
                        </div>
                        <button
                          onClick={() => toggleActive(s)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-smooth ${
                            s.active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {s.active ? "Active" : "Inactive"}
                        </button>
                      </div>

                      <div className="mb-3 pb-3 border-b border-gray-100">
                        <p className="text-sm text-gray-600 mb-1">Price Multiplier</p>
                        <p className="text-2xl font-bold text-brand-700">×{s.priceMultiplier}</p>
                      </div>

                      <button
                        onClick={() => handleDelete(s)}
                        className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-smooth"
                      >
                        Remove Service
                      </button>
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
