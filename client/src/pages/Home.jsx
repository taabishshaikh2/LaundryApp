import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Layout from "../components/Layout";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

export default function Home() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [activeOrder, setActiveOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, servicesRes] = await Promise.all([
          api.get("/orders"),
          api.get("/services"),
        ]);
        const orders = ordersRes.data.orders;
        const active = orders.find((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
        setActiveOrder(active || null);
        setRecentOrders(orders.slice(0, 3));
        setServices(servicesRes.data.services);
      } catch (err) {
        showError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showError]);

  if (loading) {
    return (
      <Layout title="Home">
        <Skeleton variant="title" />
        <Skeleton variant="card" className="my-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Home">
      <div className="animate-fade-in">
        <p className="text-gray-500">Good day 👋</p>
        <h1 className="text-heading-1 mb-6">{user?.name}</h1>

        {activeOrder && (
          <Link to={`/orders/${activeOrder._id}`}>
            <Card variant="elevated" className="mb-6 gradient-subtle border-brand-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-brand-700 font-semibold mb-1">
                    Active order
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mb-1">
                    {activeOrder.status.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-gray-600">
                    ₹{activeOrder.total} · {activeOrder.items.length} items
                  </p>
                </div>
                <Badge variant="info">Track →</Badge>
              </div>
            </Card>
          </Link>
        )}

        <h3 className="text-heading-4 mb-4">What do you need washed today?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {services.map((s) => (
            <Link key={s._id} to={`/new-order?service=${s._id}`}>
              <Card variant="interactive" className="h-full">
                <div className="text-4xl mb-3">{s.icon}</div>
                <p className="font-semibold text-gray-900 mb-1">{s.name}</p>
                <p className="text-sm text-gray-600">{s.description}</p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading-4">Recent orders</h3>
              <Link
                to="/orders"
                className="text-sm text-brand-600 font-semibold hover:text-brand-700"
              >
                View all →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <Card>
                <EmptyState
                  icon="📦"
                  title="No orders yet"
                  description="Place your first wash above to get started"
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <Link key={o._id} to={`/orders/${o._id}`}>
                    <Card variant="interactive">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-900">
                            #{o._id.slice(-6).toUpperCase()}
                          </span>
                          <Badge variant="info" className="ml-2">
                            {o.status.replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">₹{o.total}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Card>
            <h3 className="text-heading-4 mb-4">How it works</h3>
            <ol className="space-y-4 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
                  1
                </span>
                <div>
                  <strong className="block text-gray-900">Place & pickup</strong>
                  Book in minutes, we pick up from your door.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
                  2
                </span>
                <div>
                  <strong className="block text-gray-900">We wash & iron</strong>
                  Handled with care by trained partners.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs">
                  3
                </span>
                <div>
                  <strong className="block text-gray-900">Delivered back</strong>
                  Fresh and folded, right on schedule.
                </div>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
