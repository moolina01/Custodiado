import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlujoApp from "./FlujoApp";
import { loadTratoCode } from "./persistence";
import type { Trato } from "./__mocks__/api";

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
// SPEC 05 (ajuste): FlujoHeader now renders UserMenu (components/custodio/
// UserMenu.tsx) when authenticated, which calls usePathname() too.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/flujo",
}));

const { __resetMockApi, __setMockTrato, acceptTratoRequest, verifyQrRequest, simulatePaymentRequest, getTratoRequest, ApiError } = await import(
  "./__mocks__/api"
);

// SPEC 05: fixture for `?code=` deep-link tests — a trato that already
// exists, seeded directly instead of built up through create/accept.
function seedTrato(overrides: Partial<Trato> = {}) {
  const now = new Date().toISOString();
  __setMockTrato({
    id: "trato-seed",
    code: "XYZ999",
    status: "funds_held",
    createdByRole: "vendedor",
    item: "Bicicleta",
    amountClp: 100000,
    feeClp: 3000,
    buyerName: "Ana Compradora",
    sellerName: "Beto Vendedor",
    hasSellerBankDetails: true,
    acceptedAt: now,
    paidAt: now,
    releasedAt: null,
    cancelledAt: null,
    cancelReason: null,
    refundReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

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
    expect(screen.getByText("Comparte este código con el vendedor")).toBeInTheDocument();
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
    expect(screen.getByText("Comparte este código con el vendedor")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
  });

  // Regression: `useTrato`'s `restore` used to clear the persisted code on
  // *any* thrown error, not just a real 404 — so a one-off transient
  // failure right when a closed tab reopens (a 401 while the session is
  // still resolving, a 429, a 500, a dropped request) permanently lost the
  // only breadcrumb back to the trato, even though it was still perfectly
  // fine server-side.
  it("keeps the saved code after a transient restore failure, so the next attempt can still recover it", async () => {
    const { unmount } = render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
    expect(loadTratoCode("comprador")).toBe("ABC123");

    unmount();

    // The remount's one and only `getTratoRequest` call — the restore
    // effect's — fails transiently instead of finding the trato.
    getTratoRequest.mockRejectedValueOnce(new ApiError("Error de red", 500));

    await act(async () => {
      render(<FlujoApp initialRole="comprador" />);
      await vi.advanceTimersByTimeAsync(0);
    });

    // Falls back to "inicio" for *this* attempt (nothing to show without a
    // confirmed trato) — but, unlike before the fix, the code itself
    // survives so a later retry (next reload, or the next poll) isn't
    // starting from nothing.
    expect(screen.getByText("¿Cómo quieres partir?")).toBeInTheDocument();
    expect(loadTratoCode("comprador")).toBe("ABC123");
  });

  // Regression: the "landed on inicio" cleanup effect used to guard itself
  // with a plain "have I mounted before" ref — which React only answers
  // correctly outside <StrictMode>. Under Strict Mode (what `next dev`
  // actually wraps the tree in), a mount's passive effects replay a second
  // time for the very first, "inicio"-before-restore commit; that replay
  // flipped the ref to "already mounted" one firing too early, so it read
  // that first, superseded "inicio" as a *real* transition and wiped the
  // just-restored code before the trato-restore effect ever got to read
  // it — reproduced live against a real dev server, not just here. Confirms
  // the fix (comparing against the previous screen, not a boolean flag)
  // survives the exact replay that broke it.
  it("keeps the restored trato even under <StrictMode>'s double-invoked mount effects", async () => {
    const { unmount } = render(
      <StrictMode>
        <FlujoApp initialRole="comprador" />
      </StrictMode>
    );

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
    expect(loadTratoCode("comprador")).toBe("ABC123");

    unmount();

    await act(async () => {
      render(
        <StrictMode>
          <FlujoApp initialRole="comprador" />
        </StrictMode>
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("Comparte este código con el vendedor")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();
    expect(loadTratoCode("comprador")).toBe("ABC123");
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
    expect(screen.getByText("Comparte este código con el vendedor")).toBeInTheDocument();
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

  // SPEC 05: how `/panel` opens an in-progress trato — `/flujo?role=...&code=...`.
  describe("?code= deep-link", () => {
    it("opens straight on the screen matching the trato's status, skipping 'inicio' and 'codigo-ingresar'", async () => {
      seedTrato({ status: "funds_held" }); // buyer's screen for funds_held is "retenidos"

      await act(async () => {
        render(<FlujoApp initialRole="comprador" initialCode="XYZ999" />);
        // Flushes the same chain the restore-effect test above does: useSession's
        // meRequest() first, then the lookup itself.
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();
      expect(screen.queryByText("¿Cómo quieres partir?")).not.toBeInTheDocument();
      expect(screen.queryByText("Buscar el trato")).not.toBeInTheDocument(); // "codigo-ingresar"'s own button, never shown
    });

    it("puts the trato's own creator back on 'crear-codigo', not the accepter's 'esperando-pago'", async () => {
      seedTrato({ status: "awaiting_payment", createdByRole: "vendedor" });

      await act(async () => {
        render(<FlujoApp initialRole="vendedor" initialCode="XYZ999" />);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText("Comparte este código con el comprador")).toBeInTheDocument();
    });

    it("puts an accepter (not the creator) on 'esperando-pago' for the same status", async () => {
      seedTrato({ status: "awaiting_payment", createdByRole: "comprador" });

      await act(async () => {
        render(<FlujoApp initialRole="vendedor" initialCode="XYZ999" />);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByText("Aceptaste el trato")).toBeInTheDocument();
    });

    it("falls back to normal 'inicio' behavior when no code is in the URL", async () => {
      render(<FlujoApp initialRole="comprador" />);
      expect(screen.getByText("¿Cómo quieres partir?")).toBeInTheDocument();
    });
  });
});
