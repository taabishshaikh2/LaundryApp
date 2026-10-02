import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = localStorage.getItem("dg_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch {
      localStorage.removeItem("dg_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function storeSession(data) {
    localStorage.setItem("dg_token", data.token);
    localStorage.setItem("dg_refresh_token", data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    if (res.data.requiresTwoFactor) return res.data;
    return storeSession(res.data);
  }

  async function verifyTwoFactor(challengeToken, code) {
    const res = await api.post("/auth/2fa/verify-login", { challengeToken, code });
    return storeSession(res.data);
  }

  async function register(name, email, phone, password) {
    const res = await api.post("/auth/register", { name, email, phone, password });
    return storeSession(res.data);
  }

  function logout() {
    const refreshToken = localStorage.getItem("dg_refresh_token");
    if (refreshToken) api.post("/auth/logout", { refreshToken }).catch(() => {});
    localStorage.removeItem("dg_token");
    localStorage.removeItem("dg_refresh_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyTwoFactor, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
