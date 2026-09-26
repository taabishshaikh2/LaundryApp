import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";

export default function AdminDashboard() {
  const { showError } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/admin/summary");
        setSummary(res.data);
      } catch (err) {
        showError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Skeleton variant="card" count={4} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Orders"
            value={summary?.orderCount ?? "—"}
            icon="📦"
            color="blue"
          />
          <StatCard
            label="Active Orders"
            value={summary?.activeOrders ?? "—"}
            icon="🔄"
            color="orange"
          />
          <StatCard
            label="Customers"
            value={summary?.customerCount ?? "—"}
            icon="👥"
            color="green"
          />
          <StatCard
            label="Riders"
            value={summary?.riderCount ?? "—"}
            icon="🚴"
            color="purple"
          />
        </div>

        <div className="mb-6">
          <h2 className="text-heading-3 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickLink
              to="/admin/orders"
              title="Manage Orders"
              desc="View all orders, change status, see history"
              icon="📋"
            />
            <QuickLink
              to="/admin/pricing"
              title="Garments & Pricing"
              desc="Add/remove garments, update prices"
              icon="💰"
            />
            <QuickLink
              to="/admin/services"
              title="Laundry Services"
              desc="Manage Washing, Ironing, Dry Cleaning"
              icon="🧺"
            />
            <QuickLink
              to="/admin/laundry-partners"
              title="Laundry Partners"
              desc="Add/remove partner locations"
              icon="🏪"
            />
            <QuickLink
              to="/admin/customers"
              title="Customers"
              desc="View registered customers"
              icon="👤"
            />
            <QuickLink
              to="/admin/riders"
              title="Riders"
              desc="Manage rider accounts"
              icon="🛵"
            />
          </div>
        </div>

        {summary?.revenue && (
          <Card variant="elevated" className="gradient-subtle">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-brand-700">₹{summary.revenue.toLocaleString()}</p>
              </div>
              <div className="text-5xl">💸</div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, icon, color = "blue" }) {
  const colorStyles = {
    blue: "from-blue-50 to-blue-100 border-blue-200",
    orange: "from-orange-50 to-orange-100 border-orange-200",
    green: "from-green-50 to-green-100 border-green-200",
    purple: "from-purple-50 to-purple-100 border-purple-200",
  };

  return (
    <Card className={`bg-gradient-to-br ${colorStyles[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}

function QuickLink({ to, title, desc, icon }) {
  return (
    <Link to={to}>
      <Card variant="interactive" className="h-full">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">{title}</p>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
