import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { logOperation } from "../src/lib/ops-log";

describe("logOperation", () => {
  let written = "";
  const originalInfo = console.info;

  beforeEach(() => {
    written = "";
    console.info = (...args: unknown[]) => {
      written = args.map(String).join(" ");
    };
  });

  afterEach(() => {
    console.info = originalInfo;
  });

  it("emits JSON without raw resume or password fields", () => {
    logOperation({
      operation: "test",
      outcome: "ok",
      detail: "OpenRouter request failed resume text password=secret",
    });
    assert.match(written, /\[ops\]/);
    assert.doesNotMatch(written, /password=secret/i);
  });
});