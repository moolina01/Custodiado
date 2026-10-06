import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { renderBrandedEmail, renderBrandedText } = await import("./brandedTemplate");

const base = {
  baseUrl: "https://custodiado.cl",
  preheader: "Transferimos $45.800 a tu cuenta.",
  tone: "success" as const,
  title: "Trato completado",
  intro: "Transferimos $45.800 a tu cuenta.",
  details: [["Producto", "Bicicleta aro 29"]] as [string, string][],
  footnote: "Recibiste este correo porque participaste en el trato ABC-123.",
};

describe("renderBrandedEmail", () => {
  it("escapes user-supplied text (item names, people's names)", () => {
    const html = renderBrandedEmail({ ...base, details: [["Producto", '<img src=x onerror="alert(1)">']] });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("uses an absolute logo URL and links each rating star with its own score", () => {
    const html = renderBrandedEmail({ ...base, rating: { url: "https://custodiado.cl/calificar/ABC123" } });
    expect(html).toContain('src="https://custodiado.cl/logocustodiado.png"');
    for (const score of [1, 2, 3, 4, 5]) expect(html).toContain(`/calificar/ABC123?score=${score}`);
  });

  it("builds the plain-text fallback from the same content", () => {
    const text = renderBrandedText({
      ...base,
      eyebrow: "Trato ABC-123",
      notice: "No entregues nada antes de este aviso.",
      highlight: { label: "Monto", value: "$45.800" },
      cta: { label: "Ver el trato", url: "https://custodiado.cl/panel/ABC123" },
    });
    expect(text).toContain("Trato ABC-123\nTrato completado");
    expect(text).toContain("No entregues nada antes de este aviso.");
    expect(text).toContain("Producto: Bicicleta aro 29\nMonto: $45.800");
    expect(text).toContain("Ver el trato: https://custodiado.cl/panel/ABC123");
    expect(text).not.toContain("<");
  });
});
