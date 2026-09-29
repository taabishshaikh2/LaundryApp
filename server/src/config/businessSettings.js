import Settings from "../models/Settings.js";

export const BUSINESS_SETTING_DEFINITIONS = Object.freeze({
  TAX_ENABLED: { defaultValue: true, type: "boolean", public: true },
  TAX_LABEL: { defaultValue: "GST", type: "string", minLength: 1, maxLength: 20, public: true },
  TAX_PERCENT: { defaultValue: 18, type: "number", min: 0, max: 100, public: true },
  REGULAR_MIN_ORDER: { defaultValue: 199, type: "number", min: 0, max: 100000, public: true },
  EXPRESS_MIN_ORDER: { defaultValue: 249, type: "number", min: 0, max: 100000, public: true },
  EXPRESS_IRONING_ENABLED: { defaultValue: true, type: "boolean", public: true },
  DEFAULT_MAX_ORDERS: { defaultValue: 5, type: "integer", min: 1, max: 1000, public: false },
  BUSINESS_NAME: { defaultValue: "Dhobi Ghat", type: "string", minLength: 1, maxLength: 80, public: true },
  SUPPORT_PHONE: { defaultValue: "", type: "phone", public: true },
});

export function getDefaultBusinessSettings() {
  return Object.fromEntries(Object.entries(BUSINESS_SETTING_DEFINITIONS).map(([key, item]) => [key, item.defaultValue]));
}

function normalizeValue(key, rawValue) {
  const definition = BUSINESS_SETTING_DEFINITIONS[key];
  if (!definition) throw new Error(`Unknown setting: ${key}`);
  if (definition.type === "boolean") {
    if (typeof rawValue === "boolean") return rawValue;
    if (rawValue === "true") return true;
    if (rawValue === "false") return false;
    throw new Error(`${key} must be true or false`);
  }
  if (definition.type === "number" || definition.type === "integer") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) throw new Error(`${key} is required`);
    const value = Number(rawValue);
    if (!Number.isFinite(value)) throw new Error(`${key} must be a number`);
    if (definition.type === "integer" && !Number.isInteger(value)) throw new Error(`${key} must be a whole number`);
    if (value < definition.min || value > definition.max) throw new Error(`${key} must be between ${definition.min} and ${definition.max}`);
    return value;
  }
  const value = String(rawValue ?? "").trim();
  if (definition.type === "phone") {
    if (value && !/^\+?[0-9 ()-]{7,20}$/.test(value)) throw new Error(`${key} must be a valid phone number`);
    return value;
  }
  if (value.length < definition.minLength || value.length > definition.maxLength) throw new Error(`${key} must be ${definition.minLength}-${definition.maxLength} characters`);
  return value;
}

export function validateBusinessSettings(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Settings must be an object");
  const unknown = Object.keys(input).filter((key) => !BUSINESS_SETTING_DEFINITIONS[key]);
  if (unknown.length) throw new Error(`Unknown setting: ${unknown.join(", ")}`);
  const source = partial ? input : { ...getDefaultBusinessSettings(), ...input };
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, normalizeValue(key, value)]));
}

export async function getBusinessSettings() {
  const stored = await Settings.find({
    key: { $in: [...Object.keys(BUSINESS_SETTING_DEFINITIONS), "GST_PERCENT"] }
  }).lean();
  const values = Object.fromEntries(stored.map(({ key, value }) => [key, value]));
  if (values.TAX_PERCENT === undefined && values.GST_PERCENT !== undefined) {
    values.TAX_PERCENT = values.GST_PERCENT;
  }
  delete values.GST_PERCENT;
  return validateBusinessSettings(values);
}

export function getPublicBusinessSettings(settings) {
  return Object.fromEntries(Object.entries(settings).filter(([key]) => BUSINESS_SETTING_DEFINITIONS[key]?.public));
}
