import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeLastActivityBySession } from "../src/lib/session-activity";

describe("computeLastActivityBySession", () => {
  it("picks the newest attempt per session", () => {
    const qToSession = new Map([
      ["q1", "s1"],
      ["q2", "s1"],
      ["q3", "s2"],
    ]);
    const older = new Date("2026-01-01T10:00:00Z");
    const newer = new Date("2026-01-02T10:00:00Z");
    const map = computeLastActivityBySession(
      [
        { questionId: "q1", latestAt: older },
        { questionId: "q2", latestAt: newer },
        { questionId: "q3", latestAt: older },
      ],
      qToSession
    );
    assert.equal(map.get("s1")?.toISOString(), newer.toISOString());
    assert.equal(map.get("s2")?.toISOString(), older.toISOString());
  });

  it("ignores unknown questions and null timestamps", () => {
    const map = computeLastActivityBySession(
      [
        { questionId: "ghost", latestAt: new Date() },
        { questionId: "q1", latestAt: null },
      ],
      new Map([["q1", "s1"]])
    );
    assert.equal(map.size, 0);
  });

  it("is stable for the same inputs", () => {
    const qToSession = new Map([["q1", "s1"]]);
    const at = new Date("2026-06-01T00:00:00Z");
    const a = computeLastActivityBySession([{ questionId: "q1", latestAt: at }], qToSession);
    const b = computeLastActivityBySession([{ questionId: "q1", latestAt: at }], qToSession);
    assert.equal(a.get("s1")?.toISOString(), b.get("s1")?.toISOString());
  });
});