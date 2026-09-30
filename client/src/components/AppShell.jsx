import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
const customer = [["/", "Overview", "home"], ["/new-order", "Book a pickup", "plus"], ["/orders", "My orders", "bag"], ["/profile", "My account", "user"]];
const administration = [["/admin", "Overview", "grid"], ["/admin/orders", "Orders", "bag"], ["/admin/slots", "Pickup slots", "clock"], ["/admin/customers", "Customers", "user"], ["/admin/riders", "Riders", "user"], ["/admin/laundry-partners", "Laundry partners", "home"], ["/admin/services", "Services", "shirt"], ["/admin/pricing", "Garments & pricing", "shirt"], ["/admin/notifications", "Notifications", "bag"], ["/admin/payments", "Payments", "grid"], ["/admin/issues", "Issues", "bag"], ["/admin/settings", "Settings", "settings"], ["/account", "My account", "user"]];
export function Brand({
  to = "/"
}) {
  return <Link className="dg-brand" to={to}><span className="dg-mark"><Icon name="shirt" size={25} /></span><span>Dhobi Ghat<small>EVERYDAY, WELL CARED FOR.</small></span></Link>;
}
export default function AppShell({
  title,
  children,
  admin = false,
  hideMobileNav = false,
  showBack = false
}) {
  const {
    user,
    logout
  } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const close = e => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const items = admin ? administration : customer;
  const nav = <><nav aria-label={admin ? "Administration" : "Main navigation"}>{items.map(([to, label, icon], i) => <React.Fragment key={to}>{admin && (i === 0 || i === 6) && <p className="dg-nav-label">{i === 0 ? "Workspace" : "Manage"}</p>}<NavLink to={to} end={to === "/" || to === "/admin"} className={({
          isActive
        }) => `dg-nav-link ${isActive ? "is-active" : ""}`}><Icon name={icon} />{label}</NavLink></React.Fragment>)}</nav><div className="dg-sidebar-bottom">{admin ? <Link className="dg-nav-link" to="/">Customer view →</Link> : user?.role === "ADMIN" && <Link className="dg-nav-link" to="/admin">Admin workspace →</Link>}<div className="dg-user"><span className="dg-avatar">{user?.name?.charAt(0) || "D"}</span><div><strong>{user?.name}</strong><button onClick={logout}>Sign out</button></div></div></div></>;
  return <div className={`dg-app ${admin ? "dg-admin" : ""}`}><a className="dg-skip" href="#main-content">Skip to content</a><aside className="dg-sidebar"><Brand to={admin ? "/admin" : "/"} />{nav}</aside><div className="dg-body"><header className="dg-topbar"><div className="dg-mobile-brand"><Brand to={admin ? "/admin" : "/"} /></div><span className="dg-desktop">{admin ? "Operations workspace" : "Your neighbourhood garment care"}</span><span className="dg-eyebrow dg-desktop">DHOBI GHAT</span><button className="dg-menu" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? "✕" : <Icon name="menu" />}</button></header>{open && <div id="mobile-navigation" className="dg-mobile-menu">{nav}</div>}<main id="main-content" className="dg-main" tabIndex={-1}><div className="dg-page-heading"><div>{showBack && <button className="dg-back" onClick={() => navigate(-1)}>← Back</button>}<p className="dg-eyebrow">{admin ? "DHOBI GHAT / WORKSPACE" : "LESS LAUNDRY. MORE LIVING."}</p><h1>{title}</h1></div></div>{children}</main>{!admin && !hideMobileNav && <nav className="dg-bottom-nav" aria-label="Mobile navigation">{customer.map(([to, label, icon], i) => <NavLink key={to} to={to} end={to === "/"} className={({
          isActive
        }) => isActive ? "is-active" : ""}><Icon name={icon} /><span>{["Home", "Book", "Orders", "Account"][i]}</span></NavLink>)}</nav>}</div></div>;
}
