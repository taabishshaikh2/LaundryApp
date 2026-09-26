import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/orders", label: "Orders", icon: "📦" },
  { to: "/admin/customers", label: "Customers", icon: "👥" },
  { to: "/admin/riders", label: "Riders", icon: "🚴" },
  { to: "/admin/pricing", label: "Garments", icon: "👔" },
  { to: "/admin/services", label: "Services", icon: "🧺" },
  { to: "/admin/laundry-partners", label: "Partners", icon: "🏪" },
  { to: "/admin/slots", label: "Slots", icon: "⏰" },
  { to: "/admin/payments", label: "Payments", icon: "💳" },
  { to: "/admin/notifications", label: "Notifications", icon: "🔔" },
  { to: "/admin/issues", label: "Issues", icon: "📝" },
  { to: "/admin/settings", label: "Settings", icon: "⚙️" },
];

const sideLinkClass = ({ isActive }) =>
  `block px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
    isActive ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

export default function AdminLayout({ title, children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-white p-4 shrink-0">
        <Link to="/admin" className="font-bold text-xl mb-6 px-2 text-brand-700">
          🧺 Dhobi Ghat Admin
        </Link>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={sideLinkClass}>
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t pt-3 mt-3 space-y-1">
          <Link
            to="/"
            className="block px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-smooth"
          >
            <span className="mr-2">👤</span>
            Customer view
          </Link>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-smooth"
          >
            <span className="mr-2">🚪</span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + nav */}
      <div className="md:hidden">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-white border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/admin" className="font-bold text-brand-700 flex items-center gap-2">
              <span className="text-xl">🧺</span>
              <span>Admin</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className="px-3 py-1.5 text-sm rounded-lg bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-smooth"
              >
                Customer View
              </button>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-smooth"
              >
                {showMobileMenu ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Horizontal scroll nav - when menu not open */}
          {!showMobileMenu && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setShowMobileMenu(false)}
                  className={({ isActive }) =>
                    `whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-smooth ${
                      isActive
                        ? "bg-brand-600 text-white border-brand-600"
                        : "text-gray-600 border-gray-200 hover:border-brand-300"
                    }`
                  }
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="fixed inset-0 top-[57px] z-10 bg-white overflow-y-auto">
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setShowMobileMenu(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                      isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t pt-3 mt-3">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-smooth"
                >
                  <span className="text-xl">🚪</span>
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      <main className="flex-1 p-4 md:p-8">
        {title && <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">{title}</h1>}
        {children}
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
