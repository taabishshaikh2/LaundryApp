import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import Input from "../components/ui/Input";
const INITIAL_SETTINGS = {
  BUSINESS_NAME: "Dhobi Ghat",
  SUPPORT_PHONE: "",
  TAX_ENABLED: true,
  TAX_LABEL: "GST",
  TAX_PERCENT: 18,
  REGULAR_MIN_ORDER: 199,
  EXPRESS_MIN_ORDER: 249,
  EXPRESS_IRONING_ENABLED: true,
  DEFAULT_MAX_ORDERS: 5
};
export default function AdminSettings() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    async function load() {
      try {
        const {
          data
        } = await api.get("/admin/settings");
        setSettings({
          ...INITIAL_SETTINGS,
          ...data.settings
        });
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Could not load settings. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  function update(key, value) {
    setSettings(current => ({
      ...current,
      [key]: value
    }));
    setSuccess("");
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const {
        data
      } = await api.put("/admin/settings", {
        settings
      });
      setSettings(data.settings);
      setSuccess("Settings saved. New orders will use these values.");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Could not save settings. Please review the values and try again.");
    } finally {
      setSaving(false);
    }
  }
  if (loading) {
    return <AdminLayout title="Settings"><p className="dg-empty" role="status">Loading business settings…</p></AdminLayout>;
  }
  return <AdminLayout title="Settings">
      <form onSubmit={save} className="space-y-5 max-w-4xl">
        <section className="dg-card">
          <p className="dg-eyebrow">BUSINESS DETAILS</p>
          <h2 className="text-heading-3 mb-2">Your customer-facing information</h2>
          <p className="dg-muted mb-6">These details can be safely shown to customers during ordering and support.</p>
          <div className="dg-form-grid">
            <Input label="Business name" required value={settings.BUSINESS_NAME} onChange={event => update("BUSINESS_NAME", event.target.value)} />
            <Input label="Support phone / WhatsApp" type="tel" placeholder="+91 98765 43210" value={settings.SUPPORT_PHONE} onChange={event => update("SUPPORT_PHONE", event.target.value)} />
          </div>
        </section>

        <section className="dg-card">
          <p className="dg-eyebrow">TAX</p>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div><h2 className="text-heading-3">Tax calculation</h2><p className="dg-muted">Applied to future orders. Existing order totals remain unchanged.</p></div>
            <label className="flex items-center gap-3 font-medium"><input type="checkbox" checked={settings.TAX_ENABLED} onChange={event => update("TAX_ENABLED", event.target.checked)} /> Apply tax</label>
          </div>
          <div className="dg-form-grid">
            <Input label="Tax label" required disabled={!settings.TAX_ENABLED} value={settings.TAX_LABEL} onChange={event => update("TAX_LABEL", event.target.value)} />
            <Input label="Tax percentage" type="number" min="0" max="100" step="0.01" required disabled={!settings.TAX_ENABLED} value={settings.TAX_PERCENT} onChange={event => update("TAX_PERCENT", event.target.value)} />
          </div>
          <p className="dg-summary-note text-left">Confirm the appropriate tax treatment with your accountant before production use.</p>
        </section>

        <section className="dg-card">
          <p className="dg-eyebrow">ORDER RULES</p>
          <h2 className="text-heading-3 mb-2">Minimum orders and express availability</h2>
          <p className="dg-muted mb-6">The server enforces these minimums when a customer submits an order.</p>
          <div className="dg-form-grid">
            <Input label="Standard minimum order (₹)" type="number" min="0" step="1" required value={settings.REGULAR_MIN_ORDER} onChange={event => update("REGULAR_MIN_ORDER", event.target.value)} />
            <Input label="Express minimum order (₹)" type="number" min="0" step="1" required disabled={!settings.EXPRESS_IRONING_ENABLED} value={settings.EXPRESS_MIN_ORDER} onChange={event => update("EXPRESS_MIN_ORDER", event.target.value)} />
          </div>
          <label className="flex items-center gap-3 mt-5 font-medium"><input type="checkbox" checked={settings.EXPRESS_IRONING_ENABLED} onChange={event => update("EXPRESS_IRONING_ENABLED", event.target.checked)} /> Offer express ironing</label>
        </section>

        <section className="dg-card">
          <p className="dg-eyebrow">CAPACITY</p>
          <h2 className="text-heading-3 mb-2">Pickup slot defaults</h2>
          <p className="dg-muted mb-6">Used when an administrator creates a slot without specifying its capacity.</p>
          <div className="max-w-sm"><Input label="Default maximum orders per slot" type="number" min="1" max="1000" step="1" required value={settings.DEFAULT_MAX_ORDERS} onChange={event => update("DEFAULT_MAX_ORDERS", event.target.value)} /></div>
        </section>

        {error && <p className="dg-error" role="alert">{error}</p>}
        {success && <p className="text-sm text-brand-700" role="status">{success}</p>}
        <div className="flex items-center gap-4">
          <button className="dg-button" type="submit" disabled={saving}>{saving ? "Saving settings…" : "Save settings"}</button>
          <span className="dg-muted text-sm">Changes affect future orders and newly created slots.</span>
        </div>
      </form>
    </AdminLayout>;
}
