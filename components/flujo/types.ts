/**
 * Shared types for the `/flujo` wizard — the step-by-step deal flow that
 * both buyers ("comprador") and sellers ("vendedor") go through after
 * clicking a role CTA on the landing page.
 */

export type Role = "comprador" | "vendedor";

// `null` means the user hasn't chosen how to start yet (still on "inicio").
export type Mode = "crear" | "codigo" | null;

export type Screen =
  | "inicio"
  | "crear-datos"
  | "crear-codigo"
  | "codigo-ingresar"
  | "detalle"
  | "esperando-pago"
  | "pagar"
  | "banco"
  | "retenidos"
  | "cancelar"
  | "cancelado"
  | "qr"
  | "listo";

// Cancellation is a side-branch layered on top of the normal step sequence
// rather than a step in it — see `useWizardState`.
export type CancelStage = "none" | "form" | "done";

// SPEC 04: no lleva `name`/`rut` — la identidad de quien completa el wizard
// sale del perfil de la cuenta logueada (ver `useSession`), no de campos
// tipeados por trato (ese era el modelo de SPEC 03).
export type WizardFields = {
  item: string;
  amount: string; // thousands-formatted as the user types it, e.g. "180.000"
  code: string;
  bankInstitutionId: string; // Fintoc institution id, e.g. "cl_banco_estado" — see lib/fintoc/banks.ts
  account: string;
  accountType: string; // "checking_account" | "sight_account" | "" (not chosen yet)
};

export type WizardState = {
  mode: Mode;
  stepIndex: number;
  cancelStage: CancelStage;
  fields: WizardFields;
};

export type ChatMessage = { from: "me" | "bot"; text: string };
