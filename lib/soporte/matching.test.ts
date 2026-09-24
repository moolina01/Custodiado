import { describe, expect, it } from "vitest";
import { deriveKeywords, matchFaq, tokenize } from "./matching";

describe("tokenize", () => {
  it("strips accents, punctuation and stopwords", () => {
    expect(tokenize("¿Cómo libero el pago?")).toEqual(["libero", "pago"]);
  });
});

describe("deriveKeywords", () => {
  it("dedupes tokens", () => {
    expect(deriveKeywords("pago pago transferencia")).toEqual(["pago", "transferencia"]);
  });
});

describe("matchFaq", () => {
  const candidates = [
    { id: "release", keywords: ["liberar", "pago", "codigo"] },
    { id: "cancel", keywords: ["cancelar", "reembolso"] },
  ];

  it("picks the FAQ with the most keyword overlap above the threshold", () => {
    expect(matchFaq("¿cómo libero el pago con el código?", candidates)?.id).toBe("release");
  });

  it("returns null when nothing clears the minimum overlap", () => {
    expect(matchFaq("hola necesito ayuda", candidates)).toBeNull();
  });

  it("lets a short question match a short-keyword FAQ", () => {
    const short = [{ id: "reembolso", keywords: ["reembolso"] }];
    expect(matchFaq("quiero mi reembolso", short)?.id).toBe("reembolso");
  });
});
