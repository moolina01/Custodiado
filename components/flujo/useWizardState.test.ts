import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useWizardState } from "./useWizardState";

describe("useWizardState", () => {
  it("starts on 'inicio' with empty fields and no way back", () => {
    const { result } = renderHook(() => useWizardState("comprador"));

    expect(result.current.screen).toBe("inicio");
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.fields).toEqual({
      item: "",
      amount: "",
      code: "",
      bankInstitutionId: "",
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
});
