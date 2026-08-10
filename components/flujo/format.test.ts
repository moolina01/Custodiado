import { describe, expect, it } from "vitest";
import { calculateFee, formatThousands, money, toAmountNumber } from "./format";

describe("formatThousands", () => {
  it("inserts thousands separators as digits are typed", () => {
    expect(formatThousands("180000")).toBe("180.000");
    expect(formatThousands("1000000")).toBe("1.000.000");
  });

  it("strips non-digit characters first", () => {
    expect(formatThousands("$180.000")).toBe("180.000");
    expect(formatThousands("18a0b0c0")).toBe("18.000");
  });

  it("returns an empty string when there are no digits", () => {
    expect(formatThousands("")).toBe("");
    expect(formatThousands("abc")).toBe("");
  });
});

describe("toAmountNumber", () => {
  it("parses a thousands-formatted amount back to a number", () => {
    expect(toAmountNumber("180.000")).toBe(180_000);
  });

  it("falls back to the default amount when empty or invalid", () => {
    expect(toAmountNumber("")).toBe(180_000);
    expect(toAmountNumber("0")).toBe(180_000);
  });

  it("falls back to a custom value when provided", () => {
    expect(toAmountNumber("", 50_000)).toBe(50_000);
  });
});

describe("calculateFee", () => {
  it("charges 3% of the amount", () => {
    expect(calculateFee(100_000)).toBe(3_000);
  });

  it("floors the fee at $990", () => {
    expect(calculateFee(10_000)).toBe(990);
  });

  it("rounds to the nearest peso", () => {
    expect(calculateFee(33_333)).toBe(1_000); // 999.99 -> 1000
  });
});

describe("money", () => {
  it("formats a number as a peso amount", () => {
    expect(money(180_000)).toBe("$180.000");
    expect(money(990)).toBe("$990");
  });
});
