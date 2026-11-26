import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  readWorkspaceFocusMode,
  writeWorkspaceFocusMode,
  WORKSPACE_FOCUS_MODE_KEY,
} from "../src/lib/workspace-preferences";

describe("workspace focus preference", () => {
  it("defaults to off when storage is missing", () => {
    assert.equal(readWorkspaceFocusMode(null), false);
  });

  it("round-trips through an in-memory storage", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };

    assert.equal(readWorkspaceFocusMode(storage), false);
    writeWorkspaceFocusMode(true, storage);
    assert.equal(data.get(WORKSPACE_FOCUS_MODE_KEY), "1");
    assert.equal(readWorkspaceFocusMode(storage), true);
    writeWorkspaceFocusMode(false, storage);
    assert.equal(readWorkspaceFocusMode(storage), false);
  });
});