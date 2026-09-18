import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <Layout title="Profile" showBack>
      <div className="max-w-md">
        <div className="border rounded-xl p-4 mb-6 bg-white">
          <p className="font-semibold">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-sm text-gray-500">{user?.phone}</p>
        </div>

        {user?.role === "ADMIN" && (
          <Link
            to="/admin"
            className="block bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6 font-medium text-brand-700"
          >
            Go to Admin Dashboard →
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-full border border-red-200 text-red-600 rounded-xl py-3 font-semibold bg-white"
        >
          Sign out
        </button>
      </div>
    </Layout>
  );
}
