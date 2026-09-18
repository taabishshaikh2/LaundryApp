import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get("/admin/customers").then((res) => setCustomers(res.data.customers));
  }, []);

  return (
    <AdminLayout title="Customers">
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Onboarding</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.orderCount}</td>
                <td className="p-3">
                  {c.onboarding?.completed ? (
                    <span className="text-green-600 text-xs">Completed</span>
                  ) : (
                    <span className="text-gray-400 text-xs">Not done</span>
                  )}
                </td>
                <td className="p-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">No customers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
