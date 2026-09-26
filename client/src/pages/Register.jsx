import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="text-5xl mb-3">🧺</div>
          <h1 className="text-heading-1 text-brand-700 mb-2">Join Dhobi Ghat</h1>
          <p className="text-gray-600">Create your account in seconds</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
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
      </div>
    </div>
  );
}
