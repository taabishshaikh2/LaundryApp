import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useToast } from "../context/ToastContext";
import Layout from "../components/Layout";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";

export default function OrderHistory() {
  const { showError } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/orders");
        setOrders(res.data.orders);
      } catch (err) {
        showError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  const filtered = orders.filter((o) => {
    if (filter === "active") return o.status !== "DELIVERED" && o.status !== "CANCELLED";
    if (filter === "delivered") return o.status === "DELIVERED";
    if (filter === "cancelled") return o.status === "CANCELLED";
    return true;
  });

  const getStatusVariant = (status) => {
    if (status === "DELIVERED") return "success";
    if (status === "CANCELLED") return "error";
    if (status === "ORDER_PLACED" || status === "PICKUP_ASSIGNED") return "warning";
    return "info";
  };

  if (loading) {
    return (
      <Layout title="My Orders">
        <Skeleton variant="card" count={3} />
      </Layout>
    );
  }

  return (
    <Layout title="My Orders">
      <div className="animate-fade-in">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "active", "delivered", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-button text-sm font-medium whitespace-nowrap transition-smooth
                ${
                  filter === f
                    ? "bg-brand-600 text-white shadow-card"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-brand-300"
                }
              `}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="📦"
              title="No orders found"
              description={
                filter === "all"
                  ? "You haven't placed any orders yet"
                  : `No ${filter} orders found`
              }
              action={filter === "all" ? "Place your first order" : undefined}
              onAction={filter === "all" ? () => (window.location.href = "/new-order") : undefined}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <Link key={o._id} to={`/orders/${o._id}`}>
                <Card variant="interactive">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-gray-900">
                        #{o._id.slice(-6).toUpperCase()}
                      </span>
                      <Badge variant={getStatusVariant(o.status)} className="ml-2">
                        {o.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <span className="font-semibold text-gray-900">₹{o.total}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span>{o.serviceName || "Service"}</span>
                    <span className="mx-2">•</span>
                    <span>{o.items.length} items</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
