import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_VERSION } from "../src/lib/app-version";

describe("APP_VERSION", () => {
  it("matches package.json semver", () => {
    assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
  });
});