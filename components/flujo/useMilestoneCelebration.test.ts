import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { loadSeenMilestone, saveSeenMilestone } from "./persistence";
import { useMilestoneCelebration } from "./useMilestoneCelebration";

beforeEach(() => window.localStorage.clear());

describe("useMilestoneCelebration", () => {
  it("celebrates 'Pago protegido' for a seller who comes back after the buyer paid while the tab was closed", () => {
    saveSeenMilestone("ABC123", 2); // last thing this browser saw: "Trato aceptado"
    const { result } = renderHook(() => useMilestoneCelebration("ABC123", 4, true));
    expect(result.current.celebrating).toBe("protegido");
    expect(loadSeenMilestone("ABC123")).toBe(4);
  });

  it("doesn't replay it on a reload once it was shown", () => {
    saveSeenMilestone("ABC123", 4);
    const { result } = renderHook(() => useMilestoneCelebration("ABC123", 4, true));
    expect(result.current.celebrating).toBeNull();
  });

  it("celebrates live, when the count advances while on screen, and can be dismissed", () => {
    const { result, rerender } = renderHook(({ count }) => useMilestoneCelebration("ABC123", count, true), { initialProps: { count: 1 } });
    expect(result.current.celebrating).toBeNull();

    rerender({ count: 2 });
    expect(result.current.celebrating).toBe("aceptado");
    act(() => result.current.dismiss());
    expect(result.current.celebrating).toBeNull();

    rerender({ count: 4 });
    expect(result.current.celebrating).toBe("protegido");
  });

  it("only celebrates 'Trato aceptado' for whoever created the trato", () => {
    const { result, rerender } = renderHook(({ count }) => useMilestoneCelebration("ABC123", count, false), { initialProps: { count: 1 } });
    rerender({ count: 2 });
    expect(result.current.celebrating).toBeNull();
  });

  it("stays quiet for an early milestone on a trato this browser never tracked (e.g. just looked up a code)", () => {
    const { result } = renderHook(() => useMilestoneCelebration("ABC123", 2, true));
    expect(result.current.celebrating).toBeNull();
    expect(loadSeenMilestone("ABC123")).toBe(2);
  });
});
