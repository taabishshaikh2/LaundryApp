import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Layout from "../components/Layout";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import api from "../api";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    setLoading(true);
    try {
      await api.put("/auth/profile", formData);
      await refreshUser();
      showSuccess("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      showError(err?.response?.data?.error || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="Profile">
      <div className="max-w-2xl animate-fade-in">
        <Card variant="elevated" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-heading-3">Your Profile</h2>
            {!editing && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gradient-brand flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={loading}
                  disabled={!formData.name || !formData.phone}
                >
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setFormData({ name: user?.name || "", phone: user?.phone || "" });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900 mt-1">{user?.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <p className="text-gray-900 mt-1">{user?.role}</p>
              </div>
            </div>
          )}
        </Card>

        <Card variant="default" className="mt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Member since</span>
              <span className="text-gray-900 font-medium">
                {new Date(user?.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Onboarding completed</span>
              <span className="text-gray-900 font-medium">
                {user?.onboarding?.completed ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
