import test from "node:test";
import assert from "node:assert/strict";
import {
  getDefaultBusinessSettings,
  getPublicBusinessSettings,
  validateBusinessSettings,
} from "../src/config/businessSettings.js";

test("defaults are complete and valid", () => {
  const settings = validateBusinessSettings({});
  assert.deepEqual(settings, getDefaultBusinessSettings());
  assert.equal(settings.TAX_PERCENT, 18);
  assert.equal(settings.DEFAULT_MAX_ORDERS, 5);
});

test("form strings are converted to typed values", () => {
  const settings = validateBusinessSettings({
    TAX_ENABLED: "false",
    TAX_PERCENT: "5.5",
    REGULAR_MIN_ORDER: "199",
    EXPRESS_MIN_ORDER: "249",
    EXPRESS_IRONING_ENABLED: "true",
    DEFAULT_MAX_ORDERS: "8",
    TAX_LABEL: "GST",
    BUSINESS_NAME: "Dhobi Ghat",
    SUPPORT_PHONE: "+91 98765 43210",
  });
  assert.equal(settings.TAX_ENABLED, false);
  assert.equal(settings.TAX_PERCENT, 5.5);
  assert.equal(settings.DEFAULT_MAX_ORDERS, 8);
});

test("unknown and invalid settings are rejected", () => {
  assert.throws(() => validateBusinessSettings({ UNKNOWN: 1 }), /Unknown setting/);
  assert.throws(() => validateBusinessSettings({ TAX_PERCENT: 101 }), /between 0 and 100/);
  assert.throws(() => validateBusinessSettings({ DEFAULT_MAX_ORDERS: 2.5 }), /whole number/);
  assert.throws(() => validateBusinessSettings({ SUPPORT_PHONE: "abc" }), /valid phone number/);
});

test("public settings exclude internal capacity defaults", () => {
  const publicSettings = getPublicBusinessSettings(getDefaultBusinessSettings());
  assert.equal(publicSettings.DEFAULT_MAX_ORDERS, undefined);
  assert.equal(publicSettings.TAX_PERCENT, 18);
  assert.equal(publicSettings.BUSINESS_NAME, "Dhobi Ghat");
});
