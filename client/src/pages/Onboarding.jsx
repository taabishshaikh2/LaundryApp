import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const SPEND_OPTIONS = ["Nothing – we do it at home", "Under ₹300", "₹300–800", "₹800–1,500", "₹1,500+"];
const FRUSTRATION_OPTIONS = [
  "Too expensive",
  "Takes too many days",
  "No pickup & delivery",
  "Clothes damaged, lost, or poorly cleaned",
  "No reliable option nearby",
  "Nothing – I'm satisfied",
];
const PRIORITY_OPTIONS = ["Yes, definitely", "Yes, for urgent needs", "Maybe", "No"];
const SERVICE_OPTIONS = ["2-hr dry cleaning", "2-hr steam ironing", "3-4 hr wash & fold", "All of them"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [monthlySpendBand, setMonthlySpendBand] = useState("");
  const [frustrations, setFrustrations] = useState([]);
  const [wouldUsePriority, setWouldUsePriority] = useState("");
  const [mostUsedService, setMostUsedService] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  function toggleFrustration(opt) {
    setFrustrations((f) => (f.includes(opt) ? f.filter((x) => x !== opt) : [...f, opt]));
  }

  async function handleSkip() {
    setSkipping(true);
    try {
      // Marks onboarding as completed with no answers recorded.
      await api.put("/auth/onboarding", {});
      await refreshUser();
      navigate("/");
    } finally {
      setSkipping(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.put("/auth/onboarding", {
        monthlySpendBand,
        frustrations,
        wouldUsePriority,
        mostUsedService,
      });
      await refreshUser();
      navigate("/");
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed =
    (step === 0 && monthlySpendBand) ||
    (step === 1 && frustrations.length > 0) ||
    (step === 2 && wouldUsePriority) ||
    (step === 3 && mostUsedService);

  return (
    <div className="max-w-md md:max-w-xl mx-auto p-6 min-h-screen flex flex-col">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm text-gray-400 underline disabled:opacity-50"
        >
          {skipping ? "Skipping…" : "Skip for now"}
        </button>
      </div>
      <div className="flex gap-1 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-brand-600" : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="text-sm text-gray-500 mb-1">Question {step + 1} of 4</p>

      {step === 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            How much does your household spend on laundry + dry cleaning per month?
          </h2>
          {SPEND_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setMonthlySpendBand(opt)}
              className={`w-full text-left border rounded-xl px-4 py-3 mb-2 ${
                monthlySpendBand === opt ? "border-brand-600 bg-brand-50" : "border-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="text-xl font-semibold mb-1">
            What frustrates you most about your current laundry/dry cleaning option?
          </h2>
          <p className="text-sm text-gray-400 mb-4">Select all that apply</p>
          {FRUSTRATION_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => toggleFrustration(opt)}
              className={`w-full text-left border rounded-xl px-4 py-3 mb-2 ${
                frustrations.includes(opt) ? "border-brand-600 bg-brand-50" : "border-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            If Dhobi Ghat gives you fast pickup and quick delivery at the same price you pay today, would you use it?
          </h2>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setWouldUsePriority(opt)}
              className={`w-full text-left border rounded-xl px-4 py-3 mb-2 ${
                wouldUsePriority === opt ? "border-brand-600 bg-brand-50" : "border-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Which would you use most?</h2>
          {SERVICE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setMostUsedService(opt)}
              className={`w-full text-left border rounded-xl px-4 py-3 mb-2 ${
                mostUsedService === opt ? "border-brand-600 bg-brand-50" : "border-gray-200"
              }`}
            >
              {opt}
            </button>
          ))}
        </>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="border rounded-xl px-4 py-3">
            ←
          </button>
        )}
        {step < 3 ? (
          <button
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 bg-brand-600 disabled:opacity-50 text-white rounded-xl py-3 font-semibold"
          >
            Next →
          </button>
        ) : (
          <button
            disabled={!canProceed || submitting}
            onClick={handleSubmit}
            className="flex-1 bg-brand-600 disabled:opacity-50 text-white rounded-xl py-3 font-semibold"
          >
            {submitting ? "Submitting…" : "Submit ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
