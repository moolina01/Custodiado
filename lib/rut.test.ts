import { describe, expect, it } from "vitest";
import { cleanRut, computeVerifierDigit, formatRut, isValidRut, sameRut } from "./rut";

describe("cleanRut", () => {
  it("strips dots, dashes and whitespace, and uppercases the verifier", () => {
    expect(cleanRut("12.345.678-9")).toBe("123456789");
    expect(cleanRut(" 12345678-k ")).toBe("12345678K");
  });
});

describe("computeVerifierDigit", () => {
  it("computes the check digit via módulo 11", () => {
    expect(computeVerifierDigit("12345678")).toBe("5");
    expect(computeVerifierDigit("11111111")).toBe("1");
  });
});

describe("isValidRut", () => {
  it("accepts a RUT with a correct checksum, in any formatting", () => {
    expect(isValidRut("12.345.678-5")).toBe(true);
    expect(isValidRut("123456785")).toBe(true);
  });

  it("rejects a RUT with a wrong checksum", () => {
    expect(isValidRut("12.345.678-9")).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isValidRut("")).toBe(false);
    expect(isValidRut("abc")).toBe(false);
  });
});

describe("formatRut", () => {
  it("formats a plausible RUT with dots and a dash", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
  });

  it("returns the input unchanged if it isn't a plausible RUT", () => {
    expect(formatRut("abc")).toBe("abc");
  });
});

describe("sameRut", () => {
  it("treats the same RUT as equal regardless of formatting", () => {
    expect(sameRut("12.345.678-5", "123456785")).toBe(true);
    expect(sameRut("12345678-K", " 12.345.678-k ")).toBe(true);
  });

  it("is case-insensitive on the verifier digit", () => {
    expect(sameRut("12345678-k", "12345678-K")).toBe(true);
  });

  it("returns false for different RUTs", () => {
    expect(sameRut("12.345.678-5", "11.111.111-1")).toBe(false);
  });

  it("returns false when one side is empty or malformed", () => {
    expect(sameRut("12.345.678-5", "")).toBe(false);
  });
});
