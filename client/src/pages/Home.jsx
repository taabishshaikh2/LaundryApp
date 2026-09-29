import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
export default function Home() {
  const {
    user
  } = useAuth();
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [o, s] = await Promise.all([api.get("/orders"), api.get("/services")]);
      setOrders(o.data.orders);
      setServices(s.data.services);
    } catch {
      setError("We couldn't load your overview. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const active = orders.find(o => !["DELIVERED", "CANCELLED"].includes(o.status));
  const label = s => s.toLowerCase().replaceAll("_", " ");
  return <Layout title={`Hello, ${user?.name?.split(" ")[0] || "there"}.`}><section className="dg-hero"><div><p className="dg-eyebrow">CARE FOR YOUR CLOTHES. TIME FOR YOU.</p><h2>A fresh start,<br />without the laundry.</h2><p>From everyday essentials to your favourite outfits. Book a pickup and leave the care to us.</p><Link className="dg-button dg-gold" to="/new-order">Book a pickup <Icon name="arrow" size={18} /></Link></div><div className="dg-hero-art" aria-hidden="true"><div><Icon name="shirt" size={90} /></div></div></section>
 {error && <div role="alert" className="dg-error">{error} <button className="underline ml-2" onClick={load}>Try again</button></div>}
 {active && <Link className="dg-card dg-active-order" to={`/orders/${active._id}`}><div><p className="dg-eyebrow">YOUR ACTIVE ORDER · #{active._id.slice(-6).toUpperCase()}</p><strong className="capitalize">{label(active.status)}</strong><p>{active.serviceName} · ₹{Number(active.total).toFixed(2)}</p></div><span className="dg-button dg-secondary">Track your order →</span></Link>}
 <div className="dg-section-heading"><h2>A little care for everything</h2><span className="dg-muted text-xs">Our services</span></div>
 {loading ? <p role="status" className="dg-empty">Loading your services…</p> : <div className="dg-service-grid">{services.filter(s => s.active !== false).map(s => <Link className="dg-card dg-service" key={s._id} to={`/new-order?service=${s._id}`}><div className="dg-service-icon"><Icon name="shirt" size={28} /></div><h3>{s.name}</h3><p>{s.description || "Thoughtful care for your garments."}</p><div className="dg-service-footer">Choose service <Icon name="arrow" size={18} /></div></Link>)}</div>}
 {!loading && !error && services.length === 0 && <p className="dg-empty">Services aren't available yet. Please check back soon.</p>}
 <div className="dg-home-lower"><section className="dg-card"><div className="dg-section-heading" style={{
          marginTop: 0
        }}><h2>Recent orders</h2><Link to="/orders">View all →</Link></div>{loading ? <p className="dg-empty">Loading orders…</p> : orders.length === 0 ? <div className="dg-empty">Your first fresh start is just a pickup away.<br /><Link className="underline" to="/new-order">Explore services</Link></div> : orders.slice(0, 3).map(o => <Link className="dg-order-row" key={o._id} to={`/orders/${o._id}`}><div><strong>{o.serviceName || "Laundry order"}</strong><p>#{o._id.slice(-6).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short"
              })}</p></div><div><strong>₹{Number(o.total).toFixed(2)}</strong><p><span className="dg-status capitalize">{label(o.status)}</span></p></div></Link>)}</section><section className="dg-card"><h2 className="font-semibold">Three steps to a lighter day</h2><ol className="dg-how"><li><span>01</span><div><strong>Make it yours</strong>Choose a service and your garments.</div></li><li><span>02</span><div><strong>Pick your moment</strong>Select an available pickup slot.</div></li><li><span>03</span><div><strong>We'll take it from here</strong>Follow your order through to delivery.</div></li></ol></section></div></Layout>;
}
