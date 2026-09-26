import React, { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

export default function AdminCustomers() {
  const { showError } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/admin/customers");
        setCustomers(res.data.customers);
      } catch (err) {
        showError("Failed to load customers");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  if (loading) {
    return (
      <AdminLayout title="Customers">
        <Skeleton variant="card" count={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Customers">
      <div className="animate-fade-in space-y-4">
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

        {filteredCustomers.length === 0 ? (
          <Card>
            <EmptyState
              icon="👥"
              title="No customers found"
              description={searchQuery ? "Try a different search" : "No customers yet"}
            />
          </Card>
        ) : (
          <>
            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden lg:block border rounded-card overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Phone</th>
                    <th className="p-3 font-semibold">Orders</th>
                    <th className="p-3 font-semibold">Onboarding</th>
                    <th className="p-3 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c) => (
                    <tr key={c._id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-gray-600">{c.email}</td>
                      <td className="p-3 text-gray-600">{c.phone}</td>
                      <td className="p-3 font-semibold">{c.orderCount}</td>
                      <td className="p-3">
                        {c.onboarding?.completed ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards - Shown on mobile */}
            <div className="lg:hidden space-y-3">
              {filteredCustomers.map((c) => (
                <Card key={c._id} variant="default" padding="default">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-600">{c.email}</p>
                      <p className="text-sm text-gray-600">{c.phone}</p>
                    </div>
                    {c.onboarding?.completed ? (
                      <Badge variant="success">Done</Badge>
                    ) : (
                      <Badge variant="warning">Pending</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-bold text-lg text-brand-700">{c.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="font-medium text-sm">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
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
