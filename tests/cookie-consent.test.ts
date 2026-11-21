import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildConsentRecord,
  consentAllowsAnalytics,
  parseCookieConsent,
} from "../src/lib/cookie-consent";

describe("cookie consent", () => {
  it("defaults analytics to denied", () => {
    assert.equal(consentAllowsAnalytics(null), false);
    assert.equal(consentAllowsAnalytics(buildConsentRecord(false)), false);
    assert.equal(consentAllowsAnalytics(buildConsentRecord(true)), true);
  });

  it("round-trips stored JSON", () => {
    const record = buildConsentRecord(true);
    const parsed = parseCookieConsent(JSON.stringify(record));
    assert.deepEqual(parsed?.analytics, true);
    assert.equal(parseCookieConsent("not-json"), null);
  });
});