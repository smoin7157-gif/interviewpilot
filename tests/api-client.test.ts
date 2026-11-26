import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { apiFailureMessage, rateLimitMessage } from "../src/lib/api-client";

describe("rateLimitMessage", () => {
  it("formats short waits in seconds", () => {
    assert.match(rateLimitMessage("45"), /45s/);
  });

  it("formats longer waits in minutes", () => {
    assert.match(rateLimitMessage("180"), /3 min/);
  });

  it("falls back when Retry-After is missing", () => {
    assert.match(rateLimitMessage(null), /wait a minute/i);
  });
});

describe("apiFailureMessage", () => {
  it("prefers rate limit copy for 429", () => {
    assert.match(apiFailureMessage(429, "30", "ignored", "fail"), /30s/);
  });

  it("uses server error body when present", () => {
    assert.equal(apiFailureMessage(422, null, "Invalid input.", "fail"), "Invalid input.");
  });

  it("uses fallback for other statuses", () => {
    assert.equal(apiFailureMessage(500, null, undefined, "Server error."), "Server error.");
  });

  it("maps 503 to database guidance when the body is empty", () => {
    assert.match(apiFailureMessage(503, null, undefined, "fail"), /database/i);
  });

  it("prefers the server body for 503 when present", () => {
    assert.equal(apiFailureMessage(503, null, "Maintenance window.", "fail"), "Maintenance window.");
  });
});