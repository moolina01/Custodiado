import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlujoApp from "./FlujoApp";

// Manual mock of `./api` (see `__mocks__/api.ts`) — stands in for the
// `app/api/tratos/**` backend with a single in-memory trato, so the wizard
// can be driven end to end without a real server. Loaded via an explicit
// factory rather than relying on the `__mocks__` auto-pickup convention.
vi.mock("./api", async () => import("./__mocks__/api"));

const { __resetMockApi, acceptTratoRequest, verifyQrRequest, simulatePaymentRequest } = await import("./__mocks__/api");

const VALID_RUT = "12345678-5";
const POLL_INTERVAL_MS = 3000; // must match components/flujo/useTratoPolling.ts

/** Advances past one polling tick and flushes the refresh() promise it triggers. */
async function advancePoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
  });
}

function fillBankFields(rut: string, bankInstitutionId: string, accountType: string, accountNumber: string) {
  fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), { target: { value: rut } });
  const [bankSelect, accountTypeSelect] = screen.getAllByRole("combobox");
  fireEvent.change(bankSelect, { target: { value: bankInstitutionId } });
  fireEvent.change(accountTypeSelect, { target: { value: accountType } });
  fireEvent.change(screen.getByPlaceholderText("000123456789"), { target: { value: accountNumber } });
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetMockApi();
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
    fireEvent.change(screen.getByPlaceholderText("Cómo te va a ver la otra persona"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), { target: { value: VALID_RUT } });

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código")); // calls createTratoRequest
    });
    expect(screen.getByText("Pásale este código")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    // No button to click here — the seller accepting on their own screen is
    // what actually moves this forward. Simulate that directly against the
    // fake backend, then let the buyer's own poll pick it up.
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor", "Beto", VALID_RUT);
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
    fireEvent.change(screen.getByPlaceholderText("Cómo te va a ver la otra persona"), { target: { value: "Beto" } });
    fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), { target: { value: VALID_RUT } });

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    // No button to click here either — the seller's "crear" flow has no
    // separate payment-waiting screen, so it waits for the buyer to both
    // accept and pay before advancing. Simulate both directly, then let the
    // seller's own poll pick it up.
    await act(async () => {
      await acceptTratoRequest("ABC123", "comprador", "Ana", VALID_RUT);
      await simulatePaymentRequest("ABC123");
    });
    await advancePoll();
    expect(screen.getByText("¿Dónde te depositamos?")).toBeInTheDocument();

    fillBankFields(VALID_RUT, "cl_banco_estado", "checking_account", "000123456789");
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
    fireEvent.change(screen.getByPlaceholderText("Cómo te va a ver la otra persona"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), { target: { value: VALID_RUT } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor", "Beto", VALID_RUT);
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

    fillBankFields(VALID_RUT, "cl_banco_estado", "checking_account", "000123456789");
    expect(confirmButton).toBeEnabled();

    await act(async () => {
      fireEvent.click(confirmButton); // calls cancelTratoRequest
    });
    expect(screen.getByText("Procesando la devolución…")).toBeInTheDocument();

    await advancePoll(); // refund webhook, delivered on the next poll
    expect(screen.getByText("Trato cancelado")).toBeInTheDocument();
  });

  it("SPEC 03: auto-refunds the buyer when the sender RUT doesn't match, from 'pagar' straight to 'cancelado'", async () => {
    render(<FlujoApp initialRole="comprador" />);

    fireEvent.click(screen.getByText("Crear el trato"));
    fireEvent.change(screen.getByPlaceholderText("Bicicleta aro 29, poco uso"), { target: { value: "Bicicleta" } });
    fireEvent.change(screen.getByPlaceholderText("180.000"), { target: { value: "100000" } });
    fireEvent.change(screen.getByPlaceholderText("Cómo te va a ver la otra persona"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("12.345.678-9"), { target: { value: VALID_RUT } });
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    await act(async () => {
      await acceptTratoRequest("ABC123", "vendedor", "Beto", VALID_RUT);
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
});
