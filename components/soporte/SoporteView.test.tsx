import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SoporteView from "./SoporteView";

// Manual mock of `./api` (see `__mocks__/api.ts`) — same approach as
// `components/flujo/FlujoApp.test.tsx` for `./api`.
vi.mock("./api", async () => import("./__mocks__/api"));

// SoporteView renders <Navbar>, which needs a session — same stand-ins
// FlujoApp.test.tsx uses for GET /api/auth/me and next/navigation.
vi.mock("@/components/auth/api", () => ({
  meRequest: vi.fn(async () => ({ id: "user-test", email: "test@example.com", name: "Ana Compradora", rut: "12345678-5" })),
  logoutRequest: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/soporte",
}));

const { __resetMockApi, __setAutoAnswer } = await import("./__mocks__/api");

beforeEach(() => {
  __resetMockApi();
});

afterEach(() => {
  cleanup();
});

describe("SoporteView", () => {
  it("shows the FAQ answer immediately when the question matches", async () => {
    __setAutoAnswer("libero", "Escaneá el QR o ingresá el código de 6 dígitos.");
    render(<SoporteView />);

    const textarea = await screen.findByPlaceholderText(/cómo libero el pago/i);
    fireEvent.change(textarea, { target: { value: "¿Cómo libero el pago?" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /enviar consulta/i }));
    });

    expect(await screen.findByText("Escaneá el QR o ingresá el código de 6 dígitos.")).toBeInTheDocument();
  });

  it("leaves the question pending when nothing matches", async () => {
    render(<SoporteView />);

    const textarea = await screen.findByPlaceholderText(/cómo libero el pago/i);
    fireEvent.change(textarea, { target: { value: "¿Puedo pagar con cripto?" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /enviar consulta/i }));
    });

    expect(await screen.findByText(/en revisión/i)).toBeInTheDocument();
  });
});
