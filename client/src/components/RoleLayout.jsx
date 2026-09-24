import React from "react";
import { useAuth } from "../context/AuthContext";

export default function RoleLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-white border-b px-4 md:px-8 py-3 sticky top-0 z-10">
        <div>
          <p className="font-bold">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{user?.name}</span>
          <button onClick={logout} className="text-sm text-red-600 font-medium">Sign out</button>
        </div>
      </header>
      <main className="p-4 md:p-8 max-w-3xl mx-auto">{children}</main>
    </div>
  );
}
