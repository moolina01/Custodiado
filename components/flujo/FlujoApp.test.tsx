import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlujoApp from "./FlujoApp";

// Manual mock of `./api` (see `__mocks__/api.ts`) — stands in for the
// `app/api/tratos/**` backend with a single in-memory trato, so the wizard
// can be driven end to end without a real server. Loaded via an explicit
// factory rather than relying on the `__mocks__` auto-pickup convention.
vi.mock("./api", async () => import("./__mocks__/api"));

// SPEC 04: `useSession` reads this — stands in for `GET /api/auth/me`, same
// fixed identity regardless of role (an account's name/RUT don't depend on
// which side of a given trato it's playing).
vi.mock("@/components/auth/api", () => ({
  meRequest: vi.fn(async () => ({ id: "user-test", email: "test@example.com", name: "Ana Compradora", rut: "12345678-5" })),
  logoutRequest: vi.fn(async () => ({ ok: true as const })),
}));

// FlujoApp calls useRouter() for the logout button (SPEC 04) — there's no
// real App Router mounted in this test environment, so it needs a stand-in.
// None of the tests below click "Cerrar sesión", so push/refresh never
// actually run; they just need to exist so the hook call itself doesn't throw.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { __resetMockApi, acceptTratoRequest, verifyQrRequest, simulatePaymentRequest } = await import("./__mocks__/api");

const POLL_INTERVAL_MS = 3000; // must match components/flujo/useTratoPolling.ts

/** Advances past one polling tick and flushes the refresh() promise it triggers. */
async function advancePoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
  });
}

function fillBankFields(bankInstitutionId: string, accountType: string, accountNumber: string) {
  const [bankSelect, accountTypeSelect] = screen.getAllByRole("combobox");
  fireEvent.change(bankSelect, { target: { value: bankInstitutionId } });
  fireEvent.change(accountTypeSelect, { target: { value: accountType } });
  fireEvent.change(screen.getByPlaceholderText("000123456789"), { target: { value: accountNumber } });
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetMockApi();
  // Each test mounts a fresh FlujoApp expecting to start on "inicio" — but
  // useWizardState/useTrato persist to localStorage now (see
  // components/flujo/persistence.ts), which otherwise survives across
  // tests in this same jsdom environment and would resume a previous
  // test's mid-flow state instead.
  localStorage.clear();
});

afterEach(() => {
  cleanup(); // vitest doesn't run in `globals` mode, so RTL's auto-cleanup afterEach never registers itself
  vi.useRealTimers();
});

describe("FlujoApp", () => {
  it("walks the buyer through the happy path, from 'inicio' to 'listo'", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    expect(screen.getByText("Datos del trato")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código")); // calls createTratoRequest
    });
    expect(screen.getByText("Pásale este código")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    // No button to click here — the seller accepting on their own screen is
    // what actually moves this forward. Simulate that directly against the
    // fake backend, then let the buyer's own poll pick it up.
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor");
    });
    await advancePoll();
    expect(screen.getByText("Transfiere a la cuenta de custodia")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Simular transferencia (Fintoc test)"));
    });
    await advancePoll(); // inbound webhook, delivered on the next poll
    expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Ya nos juntamos"));
    expect(screen.getByText("Escanea al recibir")).toBeInTheDocument();

    // The real path is the buyer's camera decoding the seller's QR
    // (useQrScanner) — untestable in jsdom (see SPEC 02's Decisions: no
    // camera in jsdom, validated by manual QA instead). The dev-only
    // "Simular escaneo (dev)" button drives the exact same verifyQr path.
    await act(async () => {
      fireEvent.click(screen.getByText("Simular escaneo (dev)"));
    });
    expect(screen.getByText("Liberando el pago…")).toBeInTheDocument();
    await advancePoll(); // outbound webhook, delivered on the next poll
    expect(screen.getByText("Trato cerrado")).toBeInTheDocument();
  });

  it("walks the seller through the happy path, from 'inicio' to 'listo'", async () => {
    render(<FlujoApp initialRole="vendedor" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    // No button to click here either — the seller's "crear" flow has no
    // separate payment-waiting screen, so it waits for the buyer to both
    // accept and pay before advancing. Simulate both directly, then let the
    // seller's own poll pick it up.
    await act(async () => {
      await acceptTratoRequest("ABC123", "comprador");
      await simulatePaymentRequest("ABC123");
    });
    await advancePoll();
    expect(screen.getByText("¿Dónde te depositamos?")).toBeInTheDocument();

    fillBankFields("cl_banco_estado", "checking_account", "000123456789");
    await act(async () => {
      fireEvent.click(screen.getByText("Guardar y continuar")); // calls submitBankDetailsRequest
    });
    expect(screen.getByText("Muestra el QR al entregar")).toBeInTheDocument();

    // The seller has no forward action on this screen — the release is the
    // buyer's "Escanear el QR" elsewhere. Simulate that directly against the
    // fake backend, then let the seller's own poll pick it up.
    await act(async () => {
      await verifyQrRequest("ABC123", "dev-fake-token");
    });
    await advancePoll();
    expect(screen.getByText("Trato cerrado")).toBeInTheDocument();
  });

  it("walks the buyer through cancelling from 'retenidos', ending on 'cancelado'", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor");
    });
    await advancePoll();
    await act(async () => {
      fireEvent.click(screen.getByText("Simular transferencia (Fintoc test)"));
    });
    await advancePoll();
    expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar el trato y recuperar mi plata"));
    expect(screen.getByText("Cancelar el trato")).toBeInTheDocument();

    const confirmButton = screen.getByText("Confirmar cancelación");
    expect(confirmButton).toBeDisabled();

    fillBankFields("cl_banco_estado", "checking_account", "000123456789");
    expect(confirmButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(confirmButton); // calls cancelTratoRequest
    });
    expect(screen.getByText("Procesando la devolución…")).toBeInTheDocument();

    await advancePoll(); // refund webhook, delivered on the next poll
    expect(screen.getByText("Trato cancelado")).toBeInTheDocument();

    // "cancelado" is terminal but not a dead end: with the wizard persisted
    // (see components/flujo/persistence.ts), a stray reload no longer
    // resets it for free, so it needs its own explicit way back to "inicio".
    fireEvent.click(screen.getByText("Volver al inicio"));
    expect(screen.getByText("Crear el trato")).toBeInTheDocument();
  });

  it("SPEC 03: auto-refunds the buyer when the sender RUT doesn't match, from 'pagar' straight to 'cancelado'", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor");
    });
    await advancePoll();
    expect(screen.getByText("Transfiere a la cuenta de custodia")).toBeInTheDocument();

    // Real path is Fintoc's webhook reporting a `counterparty.holder_id`
    // that doesn't match the buyer's declared RUT (see
    // lib/tratos/repository.ts's matchInboundPayment) — untestable here
    // without a real webhook, so the dev-only "Simular RUT no coincidente"
    // button drives the exact same repository path (SPEC 02's precedent for
    // untestable-in-jsdom real integrations).
    await act(async () => {
      fireEvent.click(screen.getByText("Simular RUT no coincidente (dev)"));
    });
    await advancePoll(); // refund webhook, delivered on the next poll
    expect(screen.getByText("No pudimos confirmar tu pago")).toBeInTheDocument();
  });

  it("resumes on the same screen, with the same trato, after an accidental exit (unmount + remount)", async () => {
    const { unmount } = render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código")); // calls createTratoRequest
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    // Stands in for closing the tab / a stray reload — everything React was
    // holding in memory (wizard step, fetched trato) is gone; only what
    // components/flujo/persistence.ts wrote to localStorage survives.
    unmount();

    await act(async () => {
      render(<FlujoApp initialRole="comprador" />);
      // Flushes the chain this remount kicks off: FlujoApp's trato restore
      // effect waits on `useSession`'s own `meRequest()` first, then awaits
      // `getTratoRequest` itself — each its own microtask hop.
      await vi.advanceTimersByTimeAsync(0);
    });

    // Same screen (useWizardState restores which step) and the same real
    // trato (FlujoApp's restore effect, once the session resolves), not the
    // blank "inicio" a fresh mount would otherwise show.
    expect(screen.getByText("Pásale este código")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
  });

  it("offers 'Atrás' before a trato exists, but hides it once one does — no more resubmitting an already-taken step", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    // Still just local form fields, no trato yet — safe to reconsider from "inicio".
    expect(screen.getByText("Atrás")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código")); // calls createTratoRequest
    });

    // A real trato exists now — "Atrás" is gone, so there's no way back to
    // "crear-datos" to hit "Generar el código" again and mint a *second*
    // trato out from under the one just shared with the counterpart.
    expect(screen.getByText("Pásale este código")).toBeInTheDocument();
    expect(screen.queryByText("Atrás")).not.toBeInTheDocument();

    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor");
    });
    await advancePoll();
    expect(screen.getByText("Transfiere a la cuenta de custodia")).toBeInTheDocument();
    // Still no "Atrás" — rewinding into "detalle" here would let the buyer
    // hit "Aceptar y pagar" again against a trato that's already accepted.
    expect(screen.queryByText("Atrás")).not.toBeInTheDocument();
  });

  it("keeps 'Atrás' working to close the cancel form without cancelling, even with a trato in play", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor");
    });
    await advancePoll();
    await act(async () => {
      fireEvent.click(screen.getByText("Simular transferencia (Fintoc test)"));
    });
    await advancePoll();
    expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar el trato y recuperar mi plata"));
    expect(screen.getByText("Cancelar el trato")).toBeInTheDocument();

    // Backing out of the cancel form is local UI, not a backend action — it
    // stays available and just returns to "retenidos" without cancelling.
    fireEvent.click(screen.getByText("Atrás"));
    expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();
  });
});
