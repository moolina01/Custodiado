"use client";

import { useEffect, useState } from "react";
import LoginFields from "./LoginFields";
import SignupFields from "./SignupFields";
import { colors } from "@/components/flujo/theme";
import type { Role } from "@/components/flujo/types";

type AuthMode = "signup" | "login";

type AuthModalProps = {
  role: Role;
  onClose: () => void;
  onAuthenticated: () => void;
};

/**
 * SPEC 04 (corrección): reemplaza el viejo flujo de "clic en un botón de rol
 * → navegar a /login → navegar a /flujo" — el clic ahora abre esto encima
 * de la landing, sin salir de la página. Login/signup en sí no cambiaron
 * (reusa `LoginFields`/`SignupFields`, los mismos que usan `/login` y
 * `/signup`); esto es solo el marco del modal y el toggle entre los dos
 * modos. `role` no se usa acá — solo viaja hasta `onAuthenticated`
 * (ver `AuthModalContext`), que es quien decide a qué pantalla de `/flujo`
 * ir una vez autenticado.
 */
export default function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signup");

  // "Continuar con Google" es un redirect real (deja el modal/SPA por
  // completo) — necesita una URL absoluta a la que Google pueda volver una
  // vez termine. Como este modal solo existe montado en el cliente (nunca
  // en el HTML servido inicialmente, ver FlujoApp), leer `window` acá es
  // seguro, no hay mismatch de hidratación posible.
  const googleNext = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/flujo";

  // Cerrar con Escape — comportamiento esperado de cualquier modal.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,18,32,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 24px 60px rgba(11,18,32,0.3)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "22px",
            lineHeight: "1",
            cursor: "pointer",
            color: colors.textFaint,
            padding: "4px",
          }}
        >
          ×
        </button>

        {mode === "signup" ? (
          <SignupFields
            onSuccess={onAuthenticated}
            googleNext={googleNext}
            footer={
              <div style={{ marginTop: "18px", fontSize: "14px", textAlign: "center" }}>
                ¿Ya tenés cuenta?{" "}
                <button type="button" onClick={() => setMode("login")} style={LINK_BUTTON_STYLE}>
                  Inicia sesión
                </button>
              </div>
            }
          />
        ) : (
          <LoginFields
            onSuccess={onAuthenticated}
            googleNext={googleNext}
            footer={
              <div style={{ marginTop: "18px", fontSize: "14px", textAlign: "center" }}>
                ¿No tenés cuenta?{" "}
                <button type="button" onClick={() => setMode("signup")} style={LINK_BUTTON_STYLE}>
                  Crea una
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

const LINK_BUTTON_STYLE = {
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  fontWeight: 600,
  color: colors.brand,
  cursor: "pointer",
  textDecoration: "underline",
} as const;
