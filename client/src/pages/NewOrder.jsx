import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import Layout from "../components/Layout";
import Input from "../components/ui/Input";
const categories = {
  MEN: "Men",
  WOMEN: "Women",
  KIDS: "Kids",
  HOUSEHOLD: "Household"
};
const money = n => `₹${Number(n).toFixed(2)}`;
const DEFAULT_CONFIG = {
  TAX_ENABLED: true,
  TAX_LABEL: "GST",
  TAX_PERCENT: 18,
  REGULAR_MIN_ORDER: 199,
  EXPRESS_MIN_ORDER: 249,
  EXPRESS_IRONING_ENABLED: true
};
export default function NewOrder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [garments, setGarments] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState(params.get("service") || "");
  const [speed, setSpeed] = useState("REGULAR");
  const [quantities, setQuantities] = useState({});
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [address, setAddress] = useState({
    label: "Home",
    line1: "",
    landmark: "",
    pincode: ""
  });
  const [serviceArea, setServiceArea] = useState(null);
  const [areaMessage, setAreaMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [referralCredit, setReferralCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const heading = useRef(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [g, s, businessConfig] = await Promise.all([api.get("/garments"), api.get("/services"), api.get("/config")]);
      const available = s.data.services.filter(x => x.active !== false);
      setGarments(g.data.garments);
      setServices(available);
      setConfig({
        ...DEFAULT_CONFIG,
        ...businessConfig.data.settings
      });
      setServiceId(current => available.some(x => x._id === current) ? current : available[0]?._id || "");
    } catch {
      setError("Could not load services and garments. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  async function loadSlots() {
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const {
        data
      } = await api.get("/slots");
      if (!Array.isArray(data.slots)) throw Error();
      setSlots(data.slots);
    } catch {
      setSlotsError("Could not load pickup times. Please try again.");
    } finally {
      setSlotsLoading(false);
    }
  }
  useEffect(() => {
    load();
    loadSlots();
    api.get("/growth/retention").then((response) => setReferralCredit(Number(response.data.referralCredit || 0))).catch(() => {});
  }, []);
  useEffect(() => {
    const repeatId = params.get("repeat");
    if (!repeatId) return;
    api.get(`/orders/${repeatId}`).then(({ data }) => {
      setServiceId(data.order.serviceId);
      setSpeed(data.order.speed || "REGULAR");
      setQuantities(Object.fromEntries(data.order.items.map((item) => [String(item.garmentId), item.quantity])));
      setAddress({ label: data.order.address?.label || "Home", line1: data.order.address?.line1 || "", landmark: data.order.address?.landmark || "", pincode: data.order.address?.pincode || "" });
    }).catch(() => setError("The previous order could not be copied."));
  }, [params]);
  const service = services.find(s => s._id === serviceId);
  const express = service?.code === "IRONING" && speed === "EXPRESS";
  const expressAvailable = service?.code === "IRONING" && config.EXPRESS_IRONING_ENABLED;
  function price(g) {
    if (service?.code === "IRONING") return Number(express ? g.ironingExpressPrice : g.ironingRegularPrice) || 0;
    if (service?.code === "WASHING") return Number(g.washingPrice) || 0;
    if (service?.code === "DRY_CLEANING") return Number(g.dryCleaningPrice) || 0;
    return 0;
  }
  const items = garments.filter(g => quantities[g._id] > 0 && price(g) > 0).map(g => ({
    ...g,
    quantity: quantities[g._id],
    unitPrice: price(g)
  }));
  const subtotal = items.reduce((s, g) => s + g.quantity * g.unitPrice, 0);
  const discount = Number(coupon?.discount || 0);
  const creditUsed = useCredit ? Math.min(referralCredit, Math.max(0, subtotal - discount)) : 0;
  const taxableSubtotal = Math.max(0, subtotal - discount - creditUsed);
  const taxPercent = config.TAX_ENABLED ? Number(config.TAX_PERCENT) : 0;
  const tax = Math.round(taxableSubtotal * taxPercent) / 100;
  const deliveryCharge = Number(serviceArea?.deliveryCharge || 0);
  const total = Math.round((taxableSubtotal + tax + deliveryCharge) * 100) / 100;
  const minimumOrder = express ? Number(config.EXPRESS_MIN_ORDER) : Number(config.REGULAR_MIN_ORDER);
  const minimumMet = subtotal >= minimumOrder;
  const count = items.reduce((s, g) => s + g.quantity, 0);
  const visible = garments.filter(g => price(g) > 0 && (category === "ALL" || g.category === category) && g.name.toLowerCase().includes(query.toLowerCase()));
  const selected = slots.find(s => s._id === selectedSlot);
  const full = s => Number(s.bookedCount || 0) >= Number(s.maxOrders);
  const canBook = items.length > 0 && minimumMet && address.line1.trim() && serviceArea && (express || !slotsLoading && !slotsError && selected && !full(selected));
  async function validateArea() {
    setServiceArea(null); setAreaMessage("");
    if (!/^\d{6}$/.test(address.pincode)) return setAreaMessage("Enter a valid 6-digit pincode.");
    try { const { data } = await api.get(`/growth/areas/${address.pincode}`); setServiceArea(data.area); setAreaMessage(`${data.area.areaName} is covered${data.area.deliveryCharge ? ` · ₹${data.area.deliveryCharge} delivery` : " · free delivery"}.`); }
    catch (err) { setAreaMessage(err.response?.data?.error || "This pincode is outside our service area."); }
  }
  async function applyCoupon() {
    try { const { data } = await api.post("/growth/coupons/preview", { code: couponCode, subtotal }); setCoupon(data); setError(""); }
    catch (err) { setCoupon(null); setError(err.response?.data?.error || "Coupon could not be applied"); }
  }
  async function saveBag() {
    await api.put("/growth/saved-garments", { items: items.map((item) => ({ garmentId: item._id, quantity: item.quantity })) });
    setSaveMessage("Your garment preferences were saved.");
  }
  function move(next) {
    setStep(next);
    setError("");
    window.scrollTo({
      top: 0,
      behavior: "auto"
    });
    setTimeout(() => heading.current?.focus(), 0);
  }
  function chooseService(id) {
    setServiceId(id);
    setSpeed("REGULAR");
    setQuantities({});
    setQuery("");
    setCategory("ALL");
    setSelectedSlot("");
  }
  async function placeOrder() {
    if (!canBook || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const {
        data
      } = await api.post("/orders", {
        address: {
          ...address,
          line1: address.line1.trim()
        },
        speed,
        serviceId,
        pickupSlot: express ? undefined : selectedSlot,
        couponCode: coupon?.code || "",
        referralCredit: creditUsed,
        items: items.map(g => ({
          garmentId: g._id,
          quantity: g.quantity,
          treatment: "WASH_IRON"
        }))
      });
      navigate(`/orders/${data.order._id}`);
    } catch (e) {
      setError(e?.response?.data?.error || "We couldn't place your order. Please try again.");
      loadSlots();
    } finally {
      setSubmitting(false);
    }
  }
  return <Layout title="Book a pickup" hideMobileNav><ol className="dg-stepper" aria-label="Booking progress">{["Service & garments", "Pickup & review"].map((label, i) => <li key={label} className={step >= i + 1 ? "active" : ""} aria-current={step === i + 1 ? "step" : undefined}><span>{i + 1}</span>{label}</li>)}</ol><div className="dg-booking-grid"><div><h2 ref={heading} tabIndex={-1} className="sr-only">{step === 1 ? "Choose your service and garments" : "Choose your pickup and review"}</h2>{loading ? <div role="status" className="dg-card dg-empty">Loading your laundry options…</div> : step === 1 ? <><section className="dg-card dg-booking-section"><h2>What needs a little care?</h2><p>Choose a service, then add your garments.</p><div className="dg-choice-grid">{services.map(s => <button key={s._id} className="dg-choice" aria-pressed={serviceId === s._id} onClick={() => chooseService(s._id)}><strong>{s.name}</strong><small>{s.description}</small></button>)}</div>{services.length === 0 && <p className="dg-empty">No services are available yet.</p>}</section><section className="dg-card dg-booking-section"><h2>Choose your service speed</h2><div className="dg-choice-grid"><button className="dg-choice" aria-pressed={speed === "REGULAR"} onClick={() => setSpeed("REGULAR")}><strong>Standard</strong><small>24–48 hour delivery</small></button>{expressAvailable && <button className="dg-choice" aria-pressed={speed === "EXPRESS"} onClick={() => {
                setSpeed("EXPRESS");
                setSelectedSlot("");
              }}><strong>Express</strong><small>Priority ironing service</small></button>}</div></section><section className="dg-card dg-booking-section"><h2>Add your garments</h2><div className="dg-toolbar"><input aria-label="Search garments" placeholder="Search shirts, trousers, sarees…" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="dg-tabs" aria-label="Garment categories">{[["ALL", "All"], ...Object.entries(categories)].map(([key, label]) => <button key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{label}</button>)}</div>{visible.map(g => <div className="dg-garment-row" key={g._id}><div className="dg-garment-info"><div><strong>{g.name}</strong><p>{money(price(g))} / piece</p></div></div><div className="dg-quantity"><button aria-label={`Remove one ${g.name}`} disabled={!quantities[g._id]} onClick={() => setQuantities(q => ({
                  ...q,
                  [g._id]: Math.max(0, (q[g._id] || 0) - 1)
                }))}>−</button><span aria-live="polite">{quantities[g._id] || 0}</span><button aria-label={`Add one ${g.name}`} onClick={() => setQuantities(q => ({
                  ...q,
                  [g._id]: (q[g._id] || 0) + 1
                }))}>+</button></div></div>)}{visible.length === 0 && <p className="dg-empty">No matching garments for this service.</p>}</section></> : <><button className="dg-back mb-4" onClick={() => move(1)}>← Edit service and garments</button><section className="dg-card dg-booking-section"><h2>Where should we pick up?</h2><p>Add the address where your garments will be ready.</p><div className="space-y-4"><Input label="Pickup address" required autoComplete="street-address" placeholder="Flat, building, street and area" value={address.line1} onChange={e => setAddress(a => ({
                ...a,
                line1: e.target.value
              }))} /><Input label="Landmark (optional)" placeholder="Help your rider find you" value={address.landmark} onChange={e => setAddress(a => ({
                ...a,
                landmark: e.target.value
              }))} /><Input label="Pincode" required inputMode="numeric" maxLength="6" placeholder="Mumbai pincode" value={address.pincode} onChange={e => { setAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })); setServiceArea(null); setAreaMessage(""); }} onBlur={validateArea} />{areaMessage && <p className={serviceArea ? "dg-success" : "dg-error"}>{areaMessage}</p>}</div></section><section className="dg-card dg-booking-section"><h2>{express ? "Express pickup" : "Choose your pickup time"}</h2>{express ? <p>Express ironing uses the priority pickup flow. A scheduled slot isn't required.</p> : <>{slotsLoading ? <p role="status">Loading available times…</p> : slotsError ? <div role="alert" className="dg-error">{slotsError}</div> : slots.length === 0 ? <p className="dg-empty">No pickup times have been scheduled yet. Please check again before placing your order.</p> : <div className="dg-slot-grid">{slots.map(s => <button className="dg-choice" key={s._id} disabled={full(s)} aria-pressed={selectedSlot === s._id} onClick={() => setSelectedSlot(s._id)}><strong>{new Date(s.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short"
                    })}</strong><span>{s.timeRange}</span><small>{full(s) ? "Fully booked" : `${Math.max(0, s.maxOrders - (s.bookedCount || 0))} places available`}</small></button>)}</div>}<button className="dg-back underline mt-2" disabled={slotsLoading} onClick={loadSlots}>Refresh pickup times</button></>}</section></>}<button className="dg-back underline" disabled={!items.length} onClick={saveBag}>Save these garment preferences</button>{saveMessage && <p className="dg-success">{saveMessage}</p>}</div><aside className="dg-card dg-summary" aria-label="Order summary"><p className="dg-eyebrow">YOUR LAUNDRY BAG</p><h2>Looking fresh.</h2><p className="dg-muted text-sm mb-4">{service?.name || "Choose your service"} · {express ? "Express" : "Standard"}</p>{items.length === 0 ? <p className="dg-empty">Your bag is waiting.<br />Add garments to get started.</p> : items.map(g => <div className="dg-summary-line" key={g._id}><span>{g.name} × {g.quantity}</span><strong>{money(g.quantity * g.unitPrice)}</strong></div>)}<div className="dg-summary-line"><span>Subtotal · {count} pieces</span><span>{money(subtotal)}</span></div>{discount > 0 && <div className="dg-summary-line"><span>Coupon {coupon.code}</span><span>−{money(discount)}</span></div>}{creditUsed > 0 && <div className="dg-summary-line"><span>Referral credit</span><span>−{money(creditUsed)}</span></div>}{deliveryCharge > 0 && <div className="dg-summary-line"><span>Area delivery charge</span><span>{money(deliveryCharge)}</span></div>}{config.TAX_ENABLED && <div className="dg-summary-line"><span>{config.TAX_LABEL} ({taxPercent}%)</span><span>{money(tax)}</span></div>}<div className="dg-promo-entry"><input aria-label="Coupon code" placeholder="Coupon code" value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCoupon(null); }} /><button className="dg-button dg-secondary" disabled={!couponCode || !subtotal} onClick={applyCoupon}>Apply</button></div>{referralCredit > 0 && <label className="dg-check"><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} /> Use up to {money(referralCredit)} referral credit</label>}<div className="dg-summary-line total"><span>Total</span><span>{money(total)}</span></div>{error && <p className="dg-error" role="alert">{error}</p>}{loading ? null : step === 1 ? <button className="dg-button" disabled={!items.length} onClick={() => move(2)}>Choose pickup →</button> : <button className="dg-button" disabled={!canBook || submitting} onClick={placeOrder}>{submitting ? "Placing your order…" : "Confirm & place order"}</button>}<p className="dg-summary-note">{items.length > 0 && !minimumMet ? `Add ${money(minimumOrder - subtotal)} more to meet the ${money(minimumOrder)} minimum.` : step === 1 ? "Review your address and pickup time next." : !address.line1.trim() ? "Enter your pickup address to continue." : !serviceArea ? "Enter a supported pincode to continue." : !express && !selected ? "Choose an available pickup time to continue." : "Please review your details before confirming."}</p>{!loading && services.length === 0 && <button className="dg-button dg-secondary" onClick={load}>Try loading again</button>}</aside></div></Layout>;
}
