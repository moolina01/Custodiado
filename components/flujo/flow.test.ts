import { describe, expect, it } from "vitest";
import { TRATO_MILESTONES, completedMilestones, nextButtonLabel, screenFor, showsNextButton, showsProgress, stepsFor } from "./flow";
import type { Screen } from "./types";

describe("stepsFor", () => {
  it("returns the buyer's 'crear' flow", () => {
    expect(stepsFor("comprador", "crear")).toEqual(["inicio", "crear-datos", "crear-modalidad", "crear-codigo", "pagar", "retenidos", "qr", "listo"]);
  });

  it("returns the buyer's 'codigo' flow", () => {
    expect(stepsFor("comprador", "codigo")).toEqual(["inicio", "codigo-ingresar", "detalle", "pagar", "retenidos", "qr", "listo"]);
  });

  it("returns the seller's 'crear' flow", () => {
    expect(stepsFor("vendedor", "crear")).toEqual(["inicio", "crear-datos", "crear-modalidad", "crear-codigo", "banco", "retenidos", "qr", "listo"]);
  });

  it("returns the seller's 'codigo' flow", () => {
    expect(stepsFor("vendedor", "codigo")).toEqual(["inicio", "codigo-ingresar", "detalle", "esperando-pago", "banco", "retenidos", "qr", "listo"]);
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
    expect(screenFor("vendedor", "crear", 3, "none")).toBe("crear-codigo");
  });

  it("falls back to 'inicio' when stepIndex is out of range", () => {
    expect(screenFor("comprador", "crear", 99, "none")).toBe("inicio");
  });
});

describe("completedMilestones", () => {
  it("has 6 milestones, none done before a trato exists", () => {
    expect(TRATO_MILESTONES).toHaveLength(6);
    expect(completedMilestones(undefined)).toBe(0);
  });

  it("advances one at a time through creation and acceptance", () => {
    expect(completedMilestones("awaiting_acceptance")).toBe(1);
    expect(completedMilestones("awaiting_payment")).toBe(2);
  });

  it("flips 'Esperando pago' and 'Pago protegido' together — one atomic status transition, not two", () => {
    expect(completedMilestones("funds_held")).toBe(4);
    expect(completedMilestones("release_pending")).toBe(4);
  });

  it("completes every milestone once released", () => {
    expect(completedMilestones("released")).toBe(TRATO_MILESTONES.length);
  });
});

describe("showsProgress", () => {
  it("hides the milestone tracker on 'inicio', 'cancelar' and 'cancelado'", () => {
    expect(showsProgress("inicio")).toBe(false);
    expect(showsProgress("cancelar")).toBe(false);
    expect(showsProgress("cancelado")).toBe(false);
  });

  it("shows it on every other screen", () => {
    expect(showsProgress("crear-datos")).toBe(true);
    expect(showsProgress("esperando-pago")).toBe(true);
    expect(showsProgress("qr")).toBe(true);
    expect(showsProgress("listo")).toBe(true);
  });
});

describe("showsNextButton", () => {
  const noButtonScreens: Screen[] = ["inicio", "crear-codigo", "pagar", "esperando-pago", "qr", "cancelar", "retenidos", "listo"];

  it.each(noButtonScreens)("hides the next button on '%s'", (screen) => {
    expect(showsNextButton(screen)).toBe(false);
  });

  it("shows the next button on the remaining screens", () => {
    expect(showsNextButton("crear-datos")).toBe(true);
    expect(showsNextButton("detalle")).toBe(true);
    expect(showsNextButton("banco")).toBe(true);
    // "cancelado" is terminal, like "listo" — but still gets the *generic*
    // "Crear otro trato" (see flow.ts), now that the wizard's progress
    // persists across reloads and can no longer rely on one to bail it out
    // for free. "listo" gets the same button, just rendered inside the step
    // itself instead (see ListoStep) — hence it's in noButtonScreens above.
    expect(showsNextButton("cancelado")).toBe(true);
  });
});

describe("nextButtonLabel", () => {
  it("differs by role on shared screens", () => {
    expect(nextButtonLabel("detalle", "comprador")).toBe("Aceptar y pagar");
    expect(nextButtonLabel("detalle", "vendedor")).toBe("Aceptar trato");
    expect(nextButtonLabel("qr", "comprador")).toBe("Escanear el QR");
    expect(nextButtonLabel("qr", "vendedor")).toBe("El comprador ya escaneó");
  });

  it("is role-independent on the rest of the labeled screens", () => {
    expect(nextButtonLabel("crear-datos", "comprador")).toBe("Generar el código");
    expect(nextButtonLabel("codigo-ingresar", "vendedor")).toBe("Buscar el trato");
    expect(nextButtonLabel("esperando-pago", "vendedor")).toBe("Ya pagó, continuar");
    expect(nextButtonLabel("banco", "vendedor")).toBe("Guardar y continuar");
    expect(nextButtonLabel("retenidos", "comprador")).toBe("Ya nos juntamos");
    expect(nextButtonLabel("listo", "comprador")).toBe("Crear otro trato");
    expect(nextButtonLabel("cancelado", "vendedor")).toBe("Crear otro trato");
  });

  it("falls back to 'Continuar' for screens with no explicit label", () => {
    expect(nextButtonLabel("inicio", "comprador")).toBe("Continuar");
  });
});
