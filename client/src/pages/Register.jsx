import AuthLayout from "../components/AuthLayout";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
export default function Register() {
  const {
    register
  } = useAuth();
  const navigate = useNavigate();
  const {
    showError
  } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData.name, formData.email, formData.phone, formData.password);
      navigate("/onboarding");
    } catch (err) {
      showError(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return <AuthLayout title="Make yourself at home." description="Create an account to start your first pickup.">
        <div className="card-elevated p-6 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />

            <Input label="Email" name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" />

            <Input label="Phone Number" name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />

            <Input label="Password" name="password" type="password" autoComplete="new-password" required value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" />

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              {loading ? "Creating account..." : "Create account →"}
            </Button>
          </form>

          <p className="text-sm text-gray-600 mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
    </AuthLayout>;
}
