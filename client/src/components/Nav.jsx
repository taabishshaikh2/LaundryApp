import React from "react";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `flex flex-col items-center text-xs gap-1 ${isActive ? "text-brand-600 font-semibold" : "text-gray-500"}`;

export default function Nav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 max-w-md mx-auto">
      <NavLink to="/" className={linkClass} end>
        <span>🏠</span>Home
      </NavLink>
      <NavLink to="/orders" className={linkClass}>
        <span>📦</span>Orders
      </NavLink>
      <NavLink to="/new-order" className={linkClass}>
        <span>➕</span>Wash
      </NavLink>
      <NavLink to="/profile" className={linkClass}>
        <span>👤</span>Profile
      </NavLink>
    </nav>
  );
}
