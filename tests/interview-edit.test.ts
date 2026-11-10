import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { updateInterviewSchema } from "../src/lib/validation";

describe("updateInterviewSchema", () => {
  it("accepts a partial setup update", () => {
    const parsed = updateInterviewSchema.safeParse({ company: "Acme" });
    assert.equal(parsed.success, true);
  });

  it("accepts clearing an optional field with an empty string", () => {
    const parsed = updateInterviewSchema.safeParse({
      company: "",
      companyType: "",
      interviewType: "",
      jobDescription: "",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects an empty body — there is nothing to update", () => {
    assert.equal(updateInterviewSchema.safeParse({}).success, false);
  });

  it("rejects an unknown experience level", () => {
    assert.equal(updateInterviewSchema.safeParse({ seniority: "Senior" }).success, false);
  });

  it("only allows 10, 15 or 20 questions", () => {
    assert.equal(updateInterviewSchema.safeParse({ questionCount: 10 }).success, true);
    assert.equal(updateInterviewSchema.safeParse({ questionCount: 12 }).success, false);
    assert.equal(updateInterviewSchema.safeParse({ questionCount: 20 }).success, true);
  });

  it("rejects a role that is too short to be a role", () => {
    assert.equal(updateInterviewSchema.safeParse({ role: "X" }).success, false);
  });
});
