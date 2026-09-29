import assert from "node:assert/strict";
import {
  getDefaultBusinessSettings,
  getPublicBusinessSettings,
  validateBusinessSettings,
} from "../src/config/businessSettings.js";

assert.deepEqual(validateBusinessSettings({}), getDefaultBusinessSettings());
const converted = validateBusinessSettings({
  TAX_ENABLED: "false",
  TAX_LABEL: "GST",
  TAX_PERCENT: "5.5",
  REGULAR_MIN_ORDER: "199",
  EXPRESS_MIN_ORDER: "249",
  EXPRESS_IRONING_ENABLED: "true",
  DEFAULT_MAX_ORDERS: "8",
  BUSINESS_NAME: "Dhobi Ghat",
  SUPPORT_PHONE: "+91 98765 43210",
});
assert.equal(converted.TAX_ENABLED, false);
assert.equal(converted.TAX_PERCENT, 5.5);
assert.equal(converted.DEFAULT_MAX_ORDERS, 8);
assert.throws(() => validateBusinessSettings({ UNKNOWN: 1 }), /Unknown setting/);
assert.throws(() => validateBusinessSettings({ TAX_PERCENT: 101 }), /between 0 and 100/);
assert.throws(() => validateBusinessSettings({ DEFAULT_MAX_ORDERS: 2.5 }), /whole number/);
assert.throws(() => validateBusinessSettings({ SUPPORT_PHONE: "abc" }), /valid phone number/);
const publicSettings = getPublicBusinessSettings(getDefaultBusinessSettings());
assert.equal(publicSettings.DEFAULT_MAX_ORDERS, undefined);
assert.equal(publicSettings.TAX_PERCENT, 18);
console.log("Business settings checks passed.");
