import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  interviewSessionOwnedWhere,
  mockSessionOwnedWhere,
  questionOwnedWhere,
} from "../src/lib/owned-resource";

describe("owned-resource filters", () => {
  it("scopes sessions, questions, and mocks to the authenticated user", () => {
    assert.deepEqual(interviewSessionOwnedWhere("sess1", "userA"), { id: "sess1", userId: "userA" });
    assert.deepEqual(questionOwnedWhere("q1", "userA"), { id: "q1", session: { userId: "userA" } });
    assert.deepEqual(mockSessionOwnedWhere("m1", "userA"), { id: "m1", userId: "userA" });
  });
});