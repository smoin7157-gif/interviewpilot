import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isUniqueViolation } from "../src/lib/db-errors";

/**
 * Recovering from a duplicate email on signup depends on recognising Prisma's
 * unique-constraint error. The check is deliberately shape-based, so these
 * tests pin both what counts as a violation and what does not.
 */

describe("isUniqueViolation", () => {
  it("recognises a Prisma P2002 error", () => {
    assert.equal(isUniqueViolation({ code: "P2002", meta: { target: ["email"] } }), true);
  });

  it("recognises it on an Error instance", () => {
    const error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    assert.equal(isUniqueViolation(error), true);
  });

  it("ignores other Prisma codes and foreign errors", () => {
    assert.equal(isUniqueViolation({ code: "P2025" }), false);
    assert.equal(isUniqueViolation({ code: "P1001" }), false);
    assert.equal(isUniqueViolation(new Error("P2002")), false);
    assert.equal(isUniqueViolation("P2002"), false);
    assert.equal(isUniqueViolation(null), false);
    assert.equal(isUniqueViolation(undefined), false);
  });
});
