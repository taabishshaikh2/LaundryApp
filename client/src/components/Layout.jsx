import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Nav from "./Nav";

const sideLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
    isActive ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

// Full app shell: on desktop this renders as a real desktop web app
// (fixed sidebar + full-width content area). On mobile it collapses to
// a phone-app look (top bar with back button + bottom tab bar + logout option).
export default function Layout({ title, showBack = false, hideMobileNav = false, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Desktop sidebar - spans full height, app feels like a real desktop site */}
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-white p-4 shrink-0 md:h-screen md:sticky md:top-0">
        <div className="font-bold text-xl text-brand-700 mb-8 px-2">Dhobi Ghat</div>
        <nav className="space-y-1 flex-1">
          <NavLink to="/" end className={sideLinkClass}>🏠 Home</NavLink>
          <NavLink to="/new-order" className={sideLinkClass}>➕ New Order</NavLink>
          <NavLink to="/orders" className={sideLinkClass}>📦 My Orders</NavLink>
          <NavLink to="/profile" className={sideLinkClass}>👤 Profile</NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/admin" className={sideLinkClass}>🛠️ Admin Panel</NavLink>
          )}
        </nav>
        <div className="border-t pt-3">
          <p className="px-2 text-sm font-medium truncate">{user?.name}</p>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2 mt-1 rounded-lg text-sm text-red-600 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar - phone-app style */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-white sticky top-0 z-10">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="text-lg leading-none" aria-label="Go back">←</button>
        ) : (
          <span className="w-4" />
        )}
        <h1 className="font-semibold text-lg flex-1">{title}</h1>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-smooth"
          aria-label="Menu"
        >
          {showMobileMenu ? "✕" : "⋮"}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 top-[57px] z-20 bg-white overflow-y-auto">
          <div className="p-4 space-y-2">
            <div className="border-b pb-3 mb-3">
              <p className="px-4 py-2 text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="px-4 text-xs text-gray-500">{user?.email}</p>
            </div>

            <NavLink
              to="/"
              end
              onClick={() => setShowMobileMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                  isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl">🏠</span>
              Home
            </NavLink>

            <NavLink
              to="/new-order"
              onClick={() => setShowMobileMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                  isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl">➕</span>
              New Order
            </NavLink>

            <NavLink
              to="/orders"
              onClick={() => setShowMobileMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                  isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl">📦</span>
              My Orders
            </NavLink>

            <NavLink
              to="/profile"
              onClick={() => setShowMobileMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                  isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-xl">👤</span>
              Profile
            </NavLink>

            {user?.role === "ADMIN" && (
              <NavLink
                to="/admin"
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-smooth ${
                    isActive ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <span className="text-xl">🛠️</span>
                Admin Panel
              </NavLink>
            )}

            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-smooth"
              >
                <span className="text-xl">🚪</span>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content — full width on desktop, narrow centered column on mobile */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-md md:max-w-none mx-auto md:mx-0">{children}</div>
      </main>

      {!hideMobileNav && <Nav />}
    </div>
  );
}
