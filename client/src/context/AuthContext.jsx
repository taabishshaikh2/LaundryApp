import React, { createContext, useContext, useEffect, useState } from "react";
import api, { refreshAccessToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const token = localStorage.getItem("dg_token");
    if (!token) {
      try {
        const res = await refreshAccessToken();
        localStorage.setItem("dg_token", res.data.token);
        localStorage.removeItem("dg_refresh_token");
        setUser(res.data.user);
      } catch {
        localStorage.removeItem("dg_refresh_token");
        setUser(null);
      } finally {
        setLoading(false);
      }
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
    localStorage.removeItem("dg_refresh_token");
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

  async function logout() {
    try { await api.post("/auth/logout", {}); } catch { /* clear the local session even if the network is unavailable */ }
    finally { localStorage.removeItem("dg_token"); localStorage.removeItem("dg_refresh_token"); setUser(null); }
  }

  async function logoutAll() {
    await api.post("/auth/logout-all", {});
    localStorage.removeItem("dg_token");
    localStorage.removeItem("dg_refresh_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyTwoFactor, register, logout, logoutAll, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
