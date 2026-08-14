import { describe, expect, it } from "vitest";
import { loginSchema, resetPasswordConfirmSchema, resetPasswordRequestSchema, signupSchema } from "./validation";

const validSignup = { email: "vendedor@example.com", password: "un-password-largo", name: "María Pérez", rut: "12.345.678-5" };

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  it("rejects an invalid RUT", () => {
    const result = signupSchema.safeParse({ ...validSignup, rut: "12.345.678-9" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = signupSchema.safeParse({ ...validSignup, email: "no-es-un-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = signupSchema.safeParse({ ...validSignup, name: "  " });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email + any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("resetPasswordRequestSchema", () => {
  it("accepts a valid email", () => {
    expect(resetPasswordRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
});

describe("resetPasswordConfirmSchema", () => {
  it("enforces the same minimum password length as signup", () => {
    expect(resetPasswordConfirmSchema.safeParse({ password: "1234567" }).success).toBe(false);
    expect(resetPasswordConfirmSchema.safeParse({ password: "un-password-largo" }).success).toBe(true);
  });
});
