import React, { useEffect, useState } from "react";
import api from "../api";
import AdminLayout from "../components/AdminLayout";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";

export default function AdminSettings() {
  const [gst, setGst] = useState("");
  const [maxOrders, setMaxOrders] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await api.get("/admin/settings");
      const gstSetting = data.settings.find(s => s.key === "GST_PERCENT");
      const maxSetting = data.settings.find(s => s.key === "DEFAULT_MAX_ORDERS");
      if (gstSetting) setGst(gstSetting.value);
      if (maxSetting) setMaxOrders(maxSetting.value);
    }
    load();
  }, []);

  async function save() {
    setLoading(true);
    await Promise.all([
      api.put("/admin/settings", { key: "GST_PERCENT", value: gst }),
      api.put("/admin/settings", { key: "DEFAULT_MAX_ORDERS", value: maxOrders })
    ]);
    setLoading(false);
  }

  return (
    <AdminLayout title="Settings">
      <Card>
        <Input label="GST %" value={gst} onChange={setGst} />
        <Input label="Default Max Orders" value={maxOrders} onChange={setMaxOrders} />
        <button disabled={loading} onClick={save}>Save</button>
      </Card>
    </AdminLayout>
  );
}