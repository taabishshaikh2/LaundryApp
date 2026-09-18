import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data.orders));
  }, []);

  return (
    <Layout title="Your orders" showBack>
      <p className="text-gray-500 mb-6">{orders.length} orders total</p>

      {orders.length === 0 && (
        <div className="text-center mt-16">
          <p className="text-lg font-semibold mb-2">No orders yet</p>
          <p className="text-gray-500 text-sm mb-4">Place your first wash to see it here.</p>
          <Link to="/new-order" className="inline-block bg-brand-600 text-white rounded-xl px-4 py-2 font-semibold">
            Place your first wash →
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {orders.map((o) => (
          <Link key={o._id} to={`/orders/${o._id}`} className="block border rounded-xl p-4 bg-white">
            <div className="flex justify-between mb-1">
              <span className="font-medium">#{o._id.slice(-6).toUpperCase()}</span>
              <span className="text-sm text-gray-500">₹{o.total}</span>
            </div>
            <p className="text-sm text-brand-600 font-medium">{o.status.replaceAll("_", " ")}</p>
            <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
