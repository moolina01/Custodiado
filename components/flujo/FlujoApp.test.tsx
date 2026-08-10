import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FlujoApp from "./FlujoApp";

// Manual mock of `./api` (see `__mocks__/api.ts`) — stands in for the
// `app/api/tratos/**` backend with a single in-memory trato, so the wizard
// can be driven end to end without a real server. Loaded via an explicit
// factory rather than relying on the `__mocks__` auto-pickup convention.
vi.mock("./api", async () => import("./__mocks__/api"));

const { __resetMockApi, releaseTratoRequest } = await import("./__mocks__/api");

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

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código")); // calls createTratoRequest
    });
    expect(screen.getByText("Pásale este código")).toBeInTheDocument();
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    fireEvent.click(screen.getByText("El vendedor ya aceptó")); // local navigation only
    expect(screen.getByText("Transfiere a la cuenta de custodia")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Simular transferencia (Fintoc test)"));
    });
    await advancePoll(); // inbound webhook, delivered on the next poll
    expect(screen.getByText("Coordinen la entrega")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Ya nos juntamos"));
    expect(screen.getByText("Escanea al recibir")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Escanear el QR"));
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

    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    expect(screen.getByText("ABC-123")).toBeInTheDocument();

    fireEvent.click(screen.getByText("El comprador ya pagó")); // local navigation only
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
      await releaseTratoRequest("ABC123");
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
    await act(async () => {
      fireEvent.click(screen.getByText("Generar el código"));
    });
    fireEvent.click(screen.getByText("El vendedor ya aceptó"));
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
});
