import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

const STATUS_FLOW = [
  "ORDER_PLACED",
  "PICKUP_ASSIGNED",
  "RIDER_ON_THE_WAY",
  "PICKED_UP",
  "PROCESSING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await api.get(`/orders/${id}`);
      if (active) setOrder(res.data.order);
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (!order) {
    return (
      <Layout title="Order" showBack>
        <div className="p-8 text-center text-gray-500">Loading order…</div>
      </Layout>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <Layout title={`Order #${order._id.slice(-6).toUpperCase()}`} showBack>
      <p className="text-gray-500 mb-6">₹{order.total} · {order.serviceName || "Service"} · {order.items.length} items · {order.priority}</p>

      <div className="md:grid md:grid-cols-2 md:gap-8">
        <div>
          {order.status === "CANCELLED" ? (
            <p className="text-red-600 font-semibold">This order was cancelled.</p>
          ) : (
            <div className="space-y-4 mb-8">
              {STATUS_FLOW.map((s, i) => {
                const done = i <= currentIndex;
                const historyEntry = order.statusHistory.find((h) => h.newStatus === s);
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 ${done ? "bg-brand-600" : "bg-gray-200"}`} />
                    <div>
                      <p className={`font-medium ${done ? "text-gray-900" : "text-gray-400"}`}>
                        {s.replaceAll("_", " ")}
                      </p>
                      {historyEntry && (
                        <p className="text-xs text-gray-400">
                          {new Date(historyEntry.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border rounded-xl p-4 bg-white h-fit">
          <p className="font-semibold mb-2">Items</p>
          {order.items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span>{i.name} × {i.quantity}</span>
              <span>₹{i.lineTotal}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
