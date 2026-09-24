import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get("/admin/notifications").then((res) => setNotifications(res.data.notifications));
  }, []);

  return (
    <AdminLayout title="Notifications log">
      <p className="text-sm text-gray-500 mb-4">
        Every WhatsApp-style message the system has sent, newest first. Real WhatsApp Business API
        credentials aren't configured yet — these are logged and simulated as "Sent" so the flow can be
        tested end-to-end (see <code className="bg-gray-100 px-1 rounded">server/src/services/whatsapp.js</code>).
      </p>
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Template</th>
              <th className="p-3">Message</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sent</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n._id} className="border-t align-top">
                <td className="p-3">#{n.orderId?._id?.slice(-6).toUpperCase() || "—"}</td>
                <td className="p-3">{n.userId?.name}</td>
                <td className="p-3 text-xs">{n.templateName}</td>
                <td className="p-3 text-xs max-w-xs">{n.message}</td>
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      n.status === "SENT"
                        ? "bg-green-100 text-green-700"
                        : n.status === "FAILED"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {n.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-400">
                  {n.sentAt ? new Date(n.sentAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400">No notifications sent yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
