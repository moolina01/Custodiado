import { describe, expect, it } from "vitest";
import { nextButtonLabel, phaseFor, phaseName, screenFor, showsNextButton, showsProgress, stepsFor } from "./flow";
import type { Screen } from "./types";

describe("stepsFor", () => {
  it("returns the buyer's 'crear' flow", () => {
    expect(stepsFor("comprador", "crear")).toEqual(["inicio", "crear-datos", "crear-codigo", "pagar", "retenidos", "qr", "listo"]);
  });

  it("returns the buyer's 'codigo' flow", () => {
    expect(stepsFor("comprador", "codigo")).toEqual(["inicio", "codigo-ingresar", "detalle", "pagar", "retenidos", "qr", "listo"]);
  });

  it("returns the seller's 'crear' flow", () => {
    expect(stepsFor("vendedor", "crear")).toEqual(["inicio", "crear-datos", "crear-codigo", "banco", "qr", "listo"]);
  });

  it("returns the seller's 'codigo' flow", () => {
    expect(stepsFor("vendedor", "codigo")).toEqual(["inicio", "codigo-ingresar", "detalle", "esperando-pago", "banco", "qr", "listo"]);
  });

  it("returns just 'inicio' when no mode is chosen yet", () => {
    expect(stepsFor("comprador", null)).toEqual(["inicio"]);
    expect(stepsFor("vendedor", null)).toEqual(["inicio"]);
  });
});

describe("screenFor", () => {
  it("returns 'cancelar' whenever the cancel form is open, regardless of the underlying step", () => {
    expect(screenFor("comprador", "crear", 3, "form")).toBe("cancelar");
  });

  it("returns 'cancelado' once the cancellation is confirmed", () => {
    expect(screenFor("comprador", "crear", 3, "done")).toBe("cancelado");
  });

  it("resolves the screen from the role/mode flow when there's no cancellation", () => {
    expect(screenFor("vendedor", "crear", 2, "none")).toBe("crear-codigo");
  });

  it("falls back to 'inicio' when stepIndex is out of range", () => {
    expect(screenFor("comprador", "crear", 99, "none")).toBe("inicio");
  });
});

describe("phaseFor / phaseName", () => {
  it("maps known screens to their phase index", () => {
    expect(phaseFor("crear-datos")).toBe(0);
    expect(phaseFor("crear-codigo")).toBe(1);
    expect(phaseFor("banco")).toBe(2);
    expect(phaseFor("qr")).toBe(3);
  });

  it("returns undefined for screens with no phase (e.g. 'inicio')", () => {
    expect(phaseFor("inicio")).toBeUndefined();
  });

  it("names the phase, defaulting to phase 0 when undefined", () => {
    expect(phaseName(0)).toBe("Acordar el trato");
    expect(phaseName(3)).toBe("Liberar el pago");
    expect(phaseName(undefined)).toBe("Acordar el trato");
  });
});

describe("showsProgress", () => {
  it("hides the progress bar on 'inicio', 'cancelar' and 'cancelado'", () => {
    expect(showsProgress("inicio")).toBe(false);
    expect(showsProgress("cancelar")).toBe(false);
    expect(showsProgress("cancelado")).toBe(false);
  });

  it("shows the progress bar on every other screen", () => {
    expect(showsProgress("crear-datos")).toBe(true);
    expect(showsProgress("qr")).toBe(true);
    expect(showsProgress("listo")).toBe(true);
  });
});

describe("showsNextButton", () => {
  const noButtonScreens: Screen[] = ["inicio", "pagar", "esperando-pago", "qr", "cancelar", "cancelado"];

  it.each(noButtonScreens)("hides the next button on '%s'", (screen) => {
    expect(showsNextButton(screen)).toBe(false);
  });

  it("shows the next button on the remaining screens", () => {
    expect(showsNextButton("crear-datos")).toBe(true);
    expect(showsNextButton("detalle")).toBe(true);
    expect(showsNextButton("banco")).toBe(true);
    expect(showsNextButton("retenidos")).toBe(true);
    expect(showsNextButton("listo")).toBe(true);
  });
});

describe("nextButtonLabel", () => {
  it("differs by role on shared screens", () => {
    expect(nextButtonLabel("crear-codigo", "comprador")).toBe("El vendedor ya aceptó");
    expect(nextButtonLabel("crear-codigo", "vendedor")).toBe("El comprador ya pagó");
    expect(nextButtonLabel("detalle", "comprador")).toBe("Aceptar y pagar");
    expect(nextButtonLabel("detalle", "vendedor")).toBe("Aceptar el trato");
    expect(nextButtonLabel("qr", "comprador")).toBe("Escanear el QR");
    expect(nextButtonLabel("qr", "vendedor")).toBe("El comprador ya escaneó");
  });

  it("is role-independent on the rest of the labeled screens", () => {
    expect(nextButtonLabel("crear-datos", "comprador")).toBe("Generar el código");
    expect(nextButtonLabel("codigo-ingresar", "vendedor")).toBe("Buscar el trato");
    expect(nextButtonLabel("esperando-pago", "vendedor")).toBe("Ya pagó, continuar");
    expect(nextButtonLabel("banco", "vendedor")).toBe("Guardar y continuar");
    expect(nextButtonLabel("retenidos", "comprador")).toBe("Ya nos juntamos");
    expect(nextButtonLabel("listo", "comprador")).toBe("Volver al inicio");
  });

  it("falls back to 'Continuar' for screens with no explicit label", () => {
    expect(nextButtonLabel("inicio", "comprador")).toBe("Continuar");
  });
});
