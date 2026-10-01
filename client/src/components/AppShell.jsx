import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Icon from "./Icon";

const customer = [["/", "Overview", "home"], ["/new-order", "Book a pickup", "plus"], ["/orders", "My orders", "bag"], ["/notifications", "Notifications", "bell"], ["/profile", "My account", "user"]];
const administration = [["/admin", "Overview", "grid"], ["/admin/reports", "Reports", "grid"], ["/admin/orders", "Orders", "bag"], ["/admin/slots", "Pickup slots", "clock"], ["/admin/customers", "Customers", "user"], ["/admin/riders", "Riders", "user"], ["/admin/laundry-partners", "Laundry partners", "home"], ["/admin/services", "Services", "shirt"], ["/admin/pricing", "Garments & pricing", "shirt"], ["/admin/growth", "Areas & promotions", "gift"], ["/admin/alerts", "Alerts", "bell"], ["/admin/notifications", "Delivery messages", "bag"], ["/admin/payments", "Payments", "grid"], ["/admin/issues", "Issues", "bag"], ["/admin/settings", "Settings", "settings"], ["/admin/security", "Security & audit", "settings"], ["/account", "My account", "user"]];
const mobileLabels = { "/": "Home", "/new-order": "Book", "/orders": "Orders", "/notifications": "Alerts", "/profile": "Account" };

export function Brand({ to = "/" }) {
  return <Link className="dg-brand" to={to}><span className="dg-mark"><Icon name="shirt" size={25} /></span><span>Dhobi Ghat<small>EVERYDAY, WELL CARED FOR.</small></span></Link>;
}

export default function AppShell({ title, children, admin = false, hideMobileNav = false, showBack = false }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
    api.get("/notifications/unread-count").then((response) => setUnread(response.data.unreadCount)).catch(() => {});
  }, [location.pathname]);
  useEffect(() => {
    const close = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const items = admin ? administration : customer;
  const nav = <><nav aria-label={admin ? "Administration" : "Main navigation"}>{items.map(([to, label, icon]) => <React.Fragment key={to}>{admin && (to === "/admin" || to === "/admin/services") && <p className="dg-nav-label">{to === "/admin" ? "Workspace" : "Manage"}</p>}<NavLink to={to} end={to === "/" || to === "/admin"} className={({ isActive }) => `dg-nav-link ${isActive ? "is-active" : ""}`}><Icon name={icon} />{label}{["/notifications", "/admin/alerts"].includes(to) && unread > 0 && <span className="dg-unread-count">{unread > 99 ? "99+" : unread}</span>}</NavLink></React.Fragment>)}</nav><div className="dg-sidebar-bottom">{admin ? <Link className="dg-nav-link" to="/">Customer view →</Link> : user?.role === "ADMIN" && <Link className="dg-nav-link" to="/admin">Admin workspace →</Link>}<div className="dg-user"><span className="dg-avatar">{user?.name?.charAt(0) || "D"}</span><div><strong>{user?.name}</strong><button onClick={logout}>Sign out</button></div></div></div></>;
  return <div className={`dg-app ${admin ? "dg-admin" : ""}`}><a className="dg-skip" href="#main-content">Skip to content</a><aside className="dg-sidebar"><Brand to={admin ? "/admin" : "/"} />{nav}</aside><div className="dg-body"><header className="dg-topbar"><div className="dg-mobile-brand"><Brand to={admin ? "/admin" : "/"} /></div><span className="dg-desktop">{admin ? "Operations workspace" : "Your neighbourhood garment care"}</span><span className="dg-eyebrow dg-desktop">DHOBI GHAT</span><button className="dg-menu" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? "✕" : <Icon name="menu" />}</button></header>{open && <div id="mobile-navigation" className="dg-mobile-menu">{nav}</div>}<main id="main-content" className="dg-main" tabIndex={-1}><div className="dg-page-heading"><div>{showBack && <button className="dg-back" onClick={() => navigate(-1)}>← Back</button>}<p className="dg-eyebrow">{admin ? "DHOBI GHAT / WORKSPACE" : "LESS LAUNDRY. MORE LIVING."}</p><h1>{title}</h1></div></div>{children}</main>{!admin && !hideMobileNav && <nav className="dg-bottom-nav" aria-label="Mobile navigation">{customer.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => isActive ? "is-active" : ""}><Icon name={icon} /><span>{mobileLabels[to] || label}</span>{to === "/notifications" && unread > 0 && <b className="dg-bottom-badge">{unread > 9 ? "9+" : unread}</b>}</NavLink>)}</nav>}</div></div>;
}
