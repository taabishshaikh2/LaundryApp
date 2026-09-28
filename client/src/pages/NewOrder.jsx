import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";

const CATEGORY_LABELS = {
  MEN: "Men's Wear",
  WOMEN: "Women's Wear",
  KIDS: "Kids' Wear",
  HOUSEHOLD: "Household Items",
};

const GST_PERCENT = 18;

export default function NewOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedServiceId = searchParams.get("service");

  /* ------------------------------------------------------------------ */
  /*                        State declarations                        */
  /* ------------------------------------------------------------------ */
  const [garments, setGarments] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(preselectedServiceId || "");
  const [quantities, setQuantities] = useState({});
  const [priority, setPriority] = useState("REGULAR"); // REGULAR | EXPRESS
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState({ label: "Home", line1: "", landmark: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* ------------------------------------------------------------------ */
  /*                        Slots – public API                        */
  /* ------------------------------------------------------------------ */
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    api
      .get("/api/slots")
      .then((r) => setSlots(r.data.slots))
      .catch(() => setSlots([]));
  }, []);

  /* ------------------------------------------------------------------ */
  /*                        Load data – garments / services             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    api.get("/garments").then((res) => setGarments(res.data.garments));
    api
      .get("/services")
      .then((res) => {
        setServices(res.data.services);
        if (!preselectedServiceId && res.data.services.length > 0) {
          setServiceId(res.data.services[0]._id);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedService = services.find((s) => s._id === serviceId);

  /* ------------------------------------------------------------------ */
  /*                        Helpers – price / items                       */
  /* ------------------------------------------------------------------ */
  const grouped = useMemo(() => {
    const map = {};
    garments.forEach((g) => {
      map[g.category] = map[g.category] || [];
      map[g.category].push(g);
    });
    return map;
  }, [garments]);

  const getBasePrice = (garment) => {
    if (!selectedService) return 0;
    switch (selectedService.code) {
      case "WASHING":
        return garment.washingPrice || 0;
      case "DRY_CLEANING":
        return garment.dryCleaningPrice || 0;
      case "IRONING":
        return priority === "EXPRESS"
          ? garment.ironingExpressPrice || 0
          : garment.ironingRegularPrice || 0;
      default:
        return 0;
    }
  };

  const selectedItems = garments
    .filter((g) => quantities[g._id] > 0)
    .map((g) => ({
      garmentId: g._id,
      name: g.name,
      quantity: quantities[g._id],
      unitPrice: getBasePrice(g),
    }));

  const subtotal = selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const gstAmount = Math.round(subtotal * GST_PERCENT) / 100;
  const total = Math.round((subtotal + gstAmount) * 100) / 100;

  /* ------------------------------------------------------------------ */
  /*                        UI helpers                                    */
  /* ------------------------------------------------------------------ */
  function updateQty(id, delta) {
    setQuantities((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }));
  }

  async function placeOrder() {
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/orders", {
        address,
        speed: priority,
        serviceId,
        pickupSlot: selectedSlot || undefined,
        items: selectedItems.map((i) => ({
          garmentId: i.garmentId,
          quantity: i.quantity,
          treatment: "WASH_IRON",
        })),
      });
      navigate(`/orders/${res.data.order._id}`);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*                        Render                                          */
  /* ------------------------------------------------------------------ */
  return (
    <Layout title="New order" hideMobileNav>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => (step === 2 ? setStep(1) : navigate("/"))}
          className="text-lg leading-none"
          aria-label="Go back"
        >
          ←
        </button>
        <p className="text-sm text-gray-500 flex-1">
          Step {step} of 2 · {step === 1 ? "Select service & items" : "Cart"}
        </p>
        {total > 0 && (
          <span className="text-sm font-semibold bg-gray-100 rounded-full px-3 py-1">
            ₹{total.toFixed(2)}
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------------
           STEP 1 – Service & Items
      ------------------------------------------------------------------- */}
      {step === 1 && (
        <>
          <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2">Laundry service</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {services.map((s) => (
              <button
                key={s._id}
                onClick={() => setServiceId(s._id)}
                className={`rounded-xl border p-4 text-left ${
                  serviceId === s._id ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-gray-500">{s.description}</div>
              </button>
            ))}
          </div>

          <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2">Speed</h3>
          <div className="flex gap-3 mb-6">
            {selectedService && (
              <>
                {/* Washing & Dry Cleaning – only Standard */}
                {(selectedService.code === "WASHING" ||
                  selectedService.code === "DRY_CLEANING") && (
                  <button
                    onClick={() => setPriority("REGULAR")}
                    className={`flex-1 rounded-xl border p-3 text-left ${
                      priority === "REGULAR" ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white"
                    }`}
                    disabled
                  >
                    <div className="font-semibold">Standard 24‑48hr delivery</div>
                  </button>
                )}

                {/* Ironing – Standard or Express */}
                {selectedService.code === "IRONING" && (
                  <>
                    <button
                      onClick={() => setPriority("REGULAR")}
                      className={`flex-1 rounded-xl border p-3 text-left ${
                        priority === "REGULAR" ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="font-semibold">Standard 24‑48hr delivery</div>
                    </button>
                    <button
                      onClick={() => setPriority("EXPRESS")}
                      className={`flex-1 rounded-xl border p-3 text-left ${
                        priority === "EXPRESS" ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="font-semibold">Express 1hr delivery</div>
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Item picker */}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-xs uppercase text-gray-400 font-semibold mb-2">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {items.map((g) => (
                  <div key={g._id} className="border rounded-xl p-3 bg-white">
                    <div className="text-2xl mb-1">{g.icon}</div>
                    <div className="font-medium text-sm">{g.name}</div>
                    <div className="text-xs text-gray-400 mb-2">₹{getBasePrice(g)}</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(g._id, -1)}
                        className="w-8 h-8 rounded-full bg-gray-100 font-bold"
                      >
                        −
                      </button>
                      <span className="w-4 text-center">{quantities[g._id] || 0}</span>
                      <button
                        onClick={() => updateQty(g._id, 1)}
                        className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            disabled={selectedItems.length === 0 || !serviceId}
            onClick={() => setStep(2)}
            className="fixed bottom-4 left-4 right-4 md:static md:w-auto md:px-8 bg-brand-600 disabled:opacity-40 text-white rounded-xl py-3 font-semibold"
          >
            Continue →
          </button>
        </>
      )}

      {/* ------------------------------------------------------------------
           STEP 2 – Cart & pickup
      ------------------------------------------------------------------- */}
      {step === 2 && (
        <div className="max-w-md">
          {/* Order summary */}
          <div className="border rounded-xl p-4 mb-4 bg-white">
            <p className="font-semibold mb-1">
              {selectedService?.icon} {selectedService?.name} ·{" "}
              {priority === "EXPRESS" ? "Express 1hr delivery" : "Standard 24-48hr delivery"}
            </p>
            <div className="border-t my-2" />
            <p className="font-semibold mb-3">Your items</p>
            {selectedItems.map((i) => (
              <div key={i.garmentId} className="flex justify-between text-sm py-1">
                <span>{i.name} × {i.quantity}</span>
                <span>₹{i.unitPrice * i.quantity}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 text-sm flex justify-between">
              <span>Subtotal</span> <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="text-sm flex justify-between">
              <span>GST ({GST_PERCENT}%)</span> <span>₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className="font-bold flex justify-between mt-1">
              <span>Total</span> <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Address */}
          <div className="border rounded-xl p-4 mb-4 bg-white">
            <p className="font-semibold mb-3">Pickup address</p>
            <input
              placeholder="Flat / street / area"
              value={address.line1}
              onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            />
            <input
              placeholder="Landmark (optional)"
              value={address.landmark}
              onChange={(e) => setAddress((a) => ({ ...a, landmark: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* ----------------------------------------------
               Slot selector – only show if not Express
           ---------------------------------------------- */}
          {!(selectedService?.code === "IRONING" && priority === "EXPRESS") && (
            <div className="mt-4">
              <label>Pick a pickup slot</label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="">–None–</option>
                {slots.map((s) => (
                  <option key={s._id} value={s._id}>
                    {new Date(s.date).toLocaleDateString()} {s.timeRange} (max {s.maxOrders})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

          <button
            disabled={!address.line1 || submitting}
            onClick={placeOrder}
            className="w-full bg-brand-600 disabled:opacity-50 text-white rounded-xl py-3 font-semibold"
          >
            {submitting ? "Placing order…" : "Confirm & Place order"}
          </button>
        </div>
      )}
    </Layout>
  );
}