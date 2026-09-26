import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import Layout from "../components/Layout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";

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
  const { showError } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await api.get(`/orders/${id}`);
        if (active) setOrder(res.data.order);
        setLoading(false);
      } catch (err) {
        showError("Failed to load order");
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, showError]);

  if (loading) {
    return (
      <Layout title="Order" showBack>
        <Skeleton variant="title" />
        <Skeleton variant="text" count={3} className="my-6" />
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout title="Order" showBack>
        <Card>
          <p className="text-center text-gray-500 py-8">Order not found</p>
        </Card>
      </Layout>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <Layout title={`Order #${order._id.slice(-6).toUpperCase()}`} showBack>
      <div className="animate-fade-in">
        <div className="flex flex-wrap gap-2 mb-6 text-sm text-gray-600">
          <span className="font-semibold text-gray-900">₹{order.total}</span>
          <span>•</span>
          <span>{order.serviceName || "Service"}</span>
          <span>•</span>
          <span>{order.items.length} items</span>
          <span>•</span>
          <Badge variant={order.priority === "PRIORITY" ? "warning" : "neutral"}>
            {order.priority}
          </Badge>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-8">
          <Card variant="elevated">
            {order.status === "CANCELLED" ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">❌</div>
                <p className="font-semibold text-red-600">This order was cancelled</p>
              </div>
            ) : (
              <div className="space-y-6 py-2">
                {STATUS_FLOW.map((s, i) => {
                  const done = i <= currentIndex;
                  const isCurrent = i === currentIndex;
                  const historyEntry = order.statusHistory.find((h) => h.newStatus === s);
                  return (
                    <div key={s} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                            transition-all duration-300
                            ${
                              done
                                ? "bg-brand-600 text-white shadow-md"
                                : "bg-gray-200 text-gray-400"
                            }
                            ${isCurrent ? "ring-4 ring-brand-100" : ""}
                          `}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                        {i < STATUS_FLOW.length - 1 && (
                          <div
                            className={`w-0.5 h-8 mt-1 transition-colors duration-300 ${
                              done ? "bg-brand-600" : "bg-gray-200"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 -mt-1">
                        <p
                          className={`font-medium transition-colors ${
                            done ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {s.replaceAll("_", " ")}
                        </p>
                        {historyEntry && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(historyEntry.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card variant="elevated">
            <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-2">
              {order.items.map((i, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <span className="text-gray-900 font-medium">{i.name}</span>
                    <span className="text-gray-500 text-sm ml-2">× {i.quantity}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">₹{i.lineTotal}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-lg">₹{order.total}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
