import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get("/admin/summary").then((res) => setSummary(res.data));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total orders" value={summary?.orderCount ?? "—"} />
        <StatCard label="Active orders" value={summary?.activeOrders ?? "—"} />
        <StatCard label="Customers" value={summary?.customerCount ?? "—"} />
        <StatCard label="Riders" value={summary?.riderCount ?? "—"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink to="/admin/orders" title="Manage orders" desc="View every order, change status, see history" />
        <QuickLink to="/admin/pricing" title="Garments & pricing" desc="Add/remove garments, update prices per item" />
        <QuickLink to="/admin/services" title="Laundry options" desc="Add/remove Washing, Ironing, Dry Cleaning, etc." />
        <QuickLink to="/admin/laundry-partners" title="Laundry partners" desc="Add/remove partner locations" />
        <QuickLink to="/admin/customers" title="Customers" desc="See who's using Dhobi Ghat" />
        <QuickLink to="/admin/riders" title="Riders" desc="Manage rider accounts" />
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickLink({ to, title, desc }) {
  return (
    <Link to={to} className="border rounded-xl p-4 bg-white hover:border-brand-400">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-500">{desc}</p>
    </Link>
  );
}
