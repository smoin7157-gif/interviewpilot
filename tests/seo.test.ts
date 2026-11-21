import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSearchIndexingEnabled } from "../src/lib/seo";

describe("isSearchIndexingEnabled", () => {
  it("blocks indexing on Vercel preview", () => {
    assert.equal(isSearchIndexingEnabled({ VERCEL_ENV: "preview" } as NodeJS.ProcessEnv), false);
  });

  it("allows indexing on Vercel production", () => {
    assert.equal(isSearchIndexingEnabled({ VERCEL_ENV: "production" } as NodeJS.ProcessEnv), true);
  });

  it("allows indexing when VERCEL_ENV is unset (local / other hosts)", () => {
    assert.equal(isSearchIndexingEnabled({} as NodeJS.ProcessEnv), true);
  });
});