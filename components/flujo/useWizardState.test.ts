import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadWizard } from "./persistence";
import { useWizardState } from "./useWizardState";

describe("useWizardState", () => {
  // Each test renders a fresh hook expecting to start blank — persisted
  // state (see ./persistence) would otherwise carry over from whichever
  // test ran before it, since localStorage survives across tests in the
  // same jsdom environment.
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts on 'inicio' with empty fields and no way back", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    expect(result.current.screen).toBe("inicio");
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.fields).toEqual({
      item: "",
      amount: "",
      code: "",
      bankName: "",
      account: "",
      accountType: "",
    });
  });

  it("start('crear') moves the buyer to 'crear-datos' and enables going back", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));

    expect(result.current.screen).toBe("crear-datos");
    expect(result.current.canGoBack).toBe(true);
  });

  it("start('codigo') moves to 'codigo-ingresar' for either role", () => {
    const { result } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("codigo"));

    expect(result.current.screen).toBe("codigo-ingresar");
  });

  it("goNext walks through the role's flow one screen at a time", () => {
    const { result } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("crear")); // crear-datos
    expect(result.current.screen).toBe("crear-datos");

    act(() => result.current.goNext()); // crear-codigo
    expect(result.current.screen).toBe("crear-codigo");

    act(() => result.current.goNext()); // banco
    expect(result.current.screen).toBe("banco");
  });

  it("goNext past the last step ('listo') resets the wizard back to 'inicio'", () => {
    const { result } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("crear"));
    // vendedor/crear: inicio, crear-datos, crear-codigo, banco, qr, listo
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.goNext()); // banco
    act(() => result.current.goNext()); // qr
    act(() => result.current.goNext()); // listo
    expect(result.current.screen).toBe("listo");

    act(() => result.current.goNext()); // reset

    expect(result.current.screen).toBe("inicio");
    expect(result.current.canGoBack).toBe(false);
  });

  it("goBack from the first real step returns to 'inicio' and clears the mode", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));
    act(() => result.current.goBack());

    expect(result.current.screen).toBe("inicio");
    expect(result.current.canGoBack).toBe(false);
  });

  it("goBack from a later step just rewinds one screen", () => {
    const { result } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("crear")); // crear-datos
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.goBack());

    expect(result.current.screen).toBe("crear-datos");
  });

  it("openCancel branches to 'cancelar' without losing the underlying step", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.openCancel());

    expect(result.current.screen).toBe("cancelar");
    expect(result.current.canGoBack).toBe(true);
  });

  it("goBack out of the cancel branch returns to the step it was opened from, not one further back", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.openCancel());
    act(() => result.current.goBack());

    expect(result.current.screen).toBe("crear-codigo");
  });

  it("confirmCancel moves to 'cancelado' and disables going back further", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));
    act(() => result.current.openCancel());
    act(() => result.current.confirmCancel());

    expect(result.current.screen).toBe("cancelado");
    expect(result.current.canGoBack).toBe(false);
  });

  it("setField stores plain fields as typed", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.setField("item", "Bicicleta"));

    expect(result.current.fields.item).toBe("Bicicleta");
  });

  it("setField formats the 'amount' field with thousands separators", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.setField("amount", "180000"));

    expect(result.current.fields.amount).toBe("180.000");
  });

  it("persists progress so remounting (e.g. after a reload) resumes on the same screen", () => {
    const { result, unmount } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("crear"));
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.setField("item", "Bicicleta"));
    unmount();

    const { result: resumed } = renderHook(() => useWizardState("vendedor"));

    expect(resumed.current.screen).toBe("crear-codigo");
    expect(resumed.current.fields.item).toBe("Bicicleta");
  });

  it("keeps a comprador's and a vendedor's saved progress independent", () => {
    const buyer = renderHook(() => useWizardState("comprador"));
    act(() => buyer.result.current.start("crear"));
    buyer.unmount();

    const { result: seller } = renderHook(() => useWizardState("vendedor"));

    expect(seller.current.screen).toBe("inicio");
  });

  it("clears the saved entry once back on a blank 'inicio' (goNext past 'listo')", () => {
    const { result } = renderHook(() => useWizardState("vendedor"));

    act(() => result.current.start("crear"));
    // vendedor/crear: inicio, crear-datos, crear-codigo, banco, qr, listo
    act(() => result.current.goNext()); // crear-codigo
    act(() => result.current.goNext()); // banco
    act(() => result.current.goNext()); // qr
    act(() => result.current.goNext()); // listo
    expect(loadWizard("vendedor")).not.toBeNull();

    act(() => result.current.goNext()); // reset to inicio

    expect(loadWizard("vendedor")).toBeNull();
  });

  it("reset() dispatches back to a blank 'inicio'", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    act(() => result.current.start("crear"));
    act(() => result.current.goNext());
    act(() => result.current.reset());

    expect(result.current.screen).toBe("inicio");
    expect(result.current.canGoBack).toBe(false);
    expect(loadWizard("comprador")).toBeNull();
  });
});
