import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SessionSecurity() {
  const { logoutAll } = useAuth();
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function signOutEverywhere() {
    if (!window.confirm("Sign out this account from every device and browser?")) return;
    setWorking(true); setError("");
    try {
      await logoutAll();
      navigate("/login", { replace: true, state: { signedOutEverywhere: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Could not sign out all devices");
    } finally {
      setWorking(false);
    }
  }

  return <div>
    <h3>Active sessions</h3>
    <p className="dg-muted text-sm mt-2">Use this if you lost a device, used a shared computer, or believe someone else accessed your account.</p>
    {error && <div className="dg-error mt-3">{error}</div>}
    <button type="button" className="dg-button dg-danger mt-4" disabled={working} onClick={signOutEverywhere}>{working ? "Signing out…" : "Sign out from all devices"}</button>
  </div>;
}

