import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TratoDetailView from "./TratoDetailView";
import { ApiError, type PanelTrato } from "./api";

const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

const myTratoDetailRequest = vi.fn();
vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return { ...actual, myTratoDetailRequest: (...args: unknown[]) => myTratoDetailRequest(...args) };
});

function baseTrato(overrides: Partial<PanelTrato> = {}): PanelTrato {
  return {
    id: "trato-1",
    code: "ABC123",
    status: "released",
    createdByRole: "comprador",
    item: "Bicicleta",
    amountClp: 100000,
    feeClp: 3000,
    buyerName: "Ana Compradora",
    sellerName: "Beto Vendedor",
    hasSellerBankDetails: true,
    acceptedAt: "2026-08-01T00:00:00.000Z",
    paidAt: "2026-08-02T00:00:00.000Z",
    releasedAt: "2026-08-03T00:00:00.000Z",
    cancelledAt: null,
    cancelReason: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    myRole: "comprador",
    category: "completado",
    ...overrides,
  };
}

afterEach(() => {
  cleanup(); // vitest doesn't run in `globals` mode, so RTL's auto-cleanup afterEach never registers itself
  vi.resetAllMocks();
});

describe("TratoDetailView", () => {
  it("renders the read-only detail for a terminal (completado) trato", async () => {
    myTratoDetailRequest.mockResolvedValue(baseTrato());

    render(<TratoDetailView code="ABC123" />);

    await waitFor(() => expect(screen.getByText("Bicicleta")).toBeInTheDocument());
    expect(screen.getByText("Completado")).toBeInTheDocument();
    expect(screen.getByText("$100.000")).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("shows the cancel/refund reason when present", async () => {
    myTratoDetailRequest.mockResolvedValue(
      baseTrato({ status: "refunded", category: "cancelado", releasedAt: null, cancelledAt: "2026-08-03T00:00:00.000Z", cancelReason: "El comprador canceló." })
    );

    render(<TratoDetailView code="ABC123" />);

    await waitFor(() => expect(screen.getByText("El comprador canceló.")).toBeInTheDocument());
  });

  it("bounces to the wizard when the trato isn't terminal anymore", async () => {
    myTratoDetailRequest.mockResolvedValue(baseTrato({ status: "funds_held", category: "retenido", myRole: "vendedor" }));

    render(<TratoDetailView code="ABC123" />);

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/flujo?role=vendedor&code=ABC123"));
    expect(screen.queryByText("Completado")).not.toBeInTheDocument();
  });

  it("bounces to /panel on a 404 (not this account's trato)", async () => {
    myTratoDetailRequest.mockRejectedValue(new ApiError("Trato no encontrado.", 404));

    render(<TratoDetailView code="ABC123" />);

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith("/panel"));
  });

  it("shows a generic error message for anything else", async () => {
    myTratoDetailRequest.mockRejectedValue(new ApiError("Error de servidor.", 500));

    render(<TratoDetailView code="ABC123" />);

    await waitFor(() => expect(screen.getByText("Error de servidor.")).toBeInTheDocument());
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
