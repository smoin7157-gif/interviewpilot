import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  changePasswordSchema,
  createInterviewSchema,
  evaluateSchema,
  loginSchema,
  mockCreateSchema,
  mockTurnSchema,
  passwordComplexityError,
  signupSchema,
} from "../src/lib/validation";

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    const parsed = signupSchema.safeParse({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "supersecret123",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects a short password", () => {
    const parsed = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "short",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects an invalid email", () => {
    const parsed = signupSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
      password: "supersecret123",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects a password without any digit (complexity rule)", () => {
    const parsed = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "supersecretletters",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects a password without any letter (complexity rule)", () => {
    const parsed = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "12345678",
    });
    assert.equal(parsed.success, false);
  });

  it("passwordComplexityError reports the rule, not length", () => {
    assert.equal(passwordComplexityError("nodigits"), "Password must include at least one letter and one number.");
    assert.equal(passwordComplexityError("12345678"), "Password must include at least one letter and one number.");
    assert.equal(passwordComplexityError("goodpass1"), undefined);
  });

  it("trims the name", () => {
    const parsed = signupSchema.safeParse({
      name: "  Ada  ",
      email: "ada@example.com",
      password: "supersecret123",
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.name, "Ada");
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    assert.equal(
      loginSchema.safeParse({ email: "a@b.com", password: "x".repeat(8) }).success,
      true
    );
  });

  it("rejects an empty password", () => {
    assert.equal(loginSchema.safeParse({ email: "a@b.com", password: "" }).success, false);
  });
});

describe("createInterviewSchema", () => {
  const base = {
    role: "Frontend Engineer",
    seniority: "3–5 years",
    questionCount: 10,
  };

  it("accepts a minimal valid interview", () => {
    const parsed = createInterviewSchema.safeParse(base);
    assert.equal(parsed.success, true);
  });

  it("rejects a missing role", () => {
    const parsed = createInterviewSchema.safeParse({ ...base, role: "" });
    assert.equal(parsed.success, false);
  });

  it("rejects an unsupported question count", () => {
    const parsed = createInterviewSchema.safeParse({ ...base, questionCount: 12 });
    assert.equal(parsed.success, false);
  });

  it("caps projects at 8", () => {
    const projects = Array.from({ length: 9 }, (_, i) => ({ name: `Project ${i}` }));
    const parsed = createInterviewSchema.safeParse({ ...base, projects });
    assert.equal(parsed.success, false);
  });
});

describe("evaluateSchema", () => {
  it("requires at least 10 characters of answer", () => {
    assert.equal(evaluateSchema.safeParse({ answer: "too short" }).success, false);
    assert.equal(
      evaluateSchema.safeParse({ answer: "a real, thoughtful answer here" }).success,
      true
    );
  });
});

describe("mock schemas", () => {
  it("mockCreateSchema enforces the 4–20 question range", () => {
    assert.equal(mockCreateSchema.safeParse({ interviewSessionId: "abc" }).success, true);
    assert.equal(
      mockCreateSchema.safeParse({ interviewSessionId: "abc", maxQuestions: 3 }).success,
      false
    );
    assert.equal(
      mockCreateSchema.safeParse({ interviewSessionId: "abc", maxQuestions: 25 }).success,
      false
    );
  });

  it("mockTurnSchema defaults transcript to empty", () => {
    const parsed = mockTurnSchema.safeParse({});
    assert.equal(parsed.success, true);
    assert.equal(parsed.data?.transcript, "");
  });

  it("mockTurnSchema caps answer length", () => {
    assert.equal(
      mockTurnSchema.safeParse({ transcript: "x".repeat(6_001) }).success,
      false
    );
  });
});

describe("changePasswordSchema", () => {
  it("rejects a weak new password", () => {
    assert.equal(
      changePasswordSchema.safeParse({ currentPassword: "oldpass", newPassword: "short" })
        .success,
      false
    );
  });

  it("rejects a new password missing a number", () => {
    assert.equal(
      changePasswordSchema.safeParse({ currentPassword: "oldpass1", newPassword: "allletters" })
        .success,
      false
    );
  });
});