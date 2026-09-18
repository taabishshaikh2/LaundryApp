import React from "react";
import AdminLayout from "../components/AdminLayout";

export default function AdminComingSoon({ title, description }) {
  return (
    <AdminLayout title={title}>
      <div className="border border-dashed rounded-xl p-10 text-center bg-white">
        <p className="text-lg font-semibold mb-2">{title} — coming soon</p>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          {description || "This section isn't built yet in the pilot. It's next on the roadmap."}
        </p>
      </div>
    </AdminLayout>
  );
}
