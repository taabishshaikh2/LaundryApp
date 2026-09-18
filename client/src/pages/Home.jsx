import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function Home() {
  const { user } = useAuth();
  const [activeOrder, setActiveOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    api.get("/orders").then((res) => {
      const orders = res.data.orders;
      const active = orders.find((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED");
      setActiveOrder(active || null);
      setRecentOrders(orders.slice(0, 3));
    });
    api.get("/services").then((res) => setServices(res.data.services));
  }, []);

  return (
    <Layout title="Home">
      <p className="text-gray-500">Good day 👋</p>
      <h1 className="text-2xl font-bold mb-6">{user?.name}</h1>

      {activeOrder && (
        <Link
          to={`/orders/${activeOrder._id}`}
          className="block bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6"
        >
          <p className="text-xs uppercase text-brand-600 font-semibold">Active order</p>
          <p className="text-lg font-semibold">{activeOrder.status.replaceAll("_", " ")}</p>
          <p className="text-sm text-gray-500">₹{activeOrder.total} · {activeOrder.items.length} items</p>
        </Link>
      )}

      <h3 className="font-semibold mb-3">What do you need washed today?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {services.map((s) => (
          <Link
            key={s._id}
            to={`/new-order?service=${s._id}`}
            className="border rounded-2xl p-5 bg-white hover:border-brand-400 hover:shadow-sm transition"
          >
            <div className="text-3xl mb-2">{s.icon}</div>
            <p className="font-semibold">{s.name}</p>
            <p className="text-sm text-gray-500">{s.description}</p>
          </Link>
        ))}
        {services.length === 0 && (
          <div className="col-span-3 text-sm text-gray-400">Loading services…</div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent orders</h3>
            <Link to="/orders" className="text-sm text-brand-600 font-medium">View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="border rounded-xl p-6 bg-white text-center text-gray-500 text-sm">
              No orders yet — place your first wash above.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <Link key={o._id} to={`/orders/${o._id}`} className="block border rounded-xl p-4 bg-white">
                  <div className="flex justify-between">
                    <span className="font-medium">#{o._id.slice(-6).toUpperCase()}</span>
                    <span className="text-sm text-gray-500">₹{o.total}</span>
                  </div>
                  <p className="text-sm text-brand-600">{o.status.replaceAll("_", " ")}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3">How Dhobi Ghat works</h3>
          <ol className="space-y-3 text-sm text-gray-600">
            <li><strong>1. Place & pickup</strong> — Book in minutes, we pick up from your door.</li>
            <li><strong>2. We wash, iron or dry clean</strong> — Handled with care by trained partners.</li>
            <li><strong>3. Delivered back</strong> — Fresh and folded, right on schedule.</li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}
