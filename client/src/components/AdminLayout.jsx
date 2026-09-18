import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/riders", label: "Riders" },
  { to: "/admin/pricing", label: "Garments & Pricing" },
  { to: "/admin/services", label: "Laundry Options" },
  { to: "/admin/laundry-partners", label: "Laundry Partners" },
  { to: "/admin/slots", label: "Slots" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/notifications", label: "Notifications" },
  { to: "/admin/issues", label: "Issues / Notes" },
  { to: "/admin/settings", label: "Settings" },
];

const sideLinkClass = ({ isActive }) =>
  `block px-4 py-2 rounded-lg text-sm font-medium ${
    isActive ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

export default function AdminLayout({ title, children }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r bg-white p-4 shrink-0">
        <Link to="/admin" className="font-bold text-lg mb-6 px-2">Dhobi Ghat Admin</Link>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={sideLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t pt-3 mt-3 space-y-1">
          <Link to="/" className="block px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100">
            Customer view
          </Link>
          <button onClick={logout} className="w-full text-left px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-gray-100">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + horizontal scroll nav */}
      <div className="md:hidden sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-bold">Dhobi Ghat Admin</span>
          <button onClick={logout} className="text-sm text-red-600">Sign out</button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap text-xs px-3 py-1.5 rounded-full border ${
                  isActive ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-200"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8">
        {title && <h1 className="text-2xl font-bold mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  );
}
