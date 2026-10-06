import { describe, expect, it } from "vitest";
import { ratingSchema } from "./validation";

describe("ratingSchema", () => {
  it("accepts 1–5 stars, with or without a comment", () => {
    expect(ratingSchema.parse({ score: 5 })).toEqual({ score: 5, comment: undefined });
    expect(ratingSchema.parse({ score: 1, comment: "  Llegó tarde  " })).toEqual({ score: 1, comment: "Llegó tarde" });
  });

  it("treats a blank comment as no comment", () => {
    expect(ratingSchema.parse({ score: 4, comment: "   " }).comment).toBeUndefined();
  });

  it("rejects scores outside 1–5 and non-integers", () => {
    for (const score of [0, 6, 3.5]) expect(ratingSchema.safeParse({ score }).success).toBe(false);
  });

  it("rejects comments over 1000 characters", () => {
    expect(ratingSchema.safeParse({ score: 3, comment: "a".repeat(1001) }).success).toBe(false);
  });
});
