import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  indexNowKeyPath,
  isIndexNowKeyRequest,
} from "../src/lib/indexnow";

describe("indexNow", () => {
  it("builds key path from env value", () => {
    assert.equal(indexNowKeyPath("a1b2c3d4"), "/a1b2c3d4.txt");
    assert.equal(indexNowKeyPath("  "), null);
    assert.equal(indexNowKeyPath(undefined), null);
  });

  it("matches only the configured key file", () => {
    assert.equal(isIndexNowKeyRequest("/a1b2c3d4.txt", "a1b2c3d4"), true);
    assert.equal(isIndexNowKeyRequest("/llms.txt", "a1b2c3d4"), false);
    assert.equal(isIndexNowKeyRequest("/a1b2c3d4.txt", ""), false);
  });
});