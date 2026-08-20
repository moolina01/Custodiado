import Navbar from "@/components/custodio/Navbar";
import Footer from "@/components/custodio/Footer";
import StepHeading from "./ui/StepHeading";
import { PathPanel } from "./steps/InicioStep";
import { RetainedFundsIllustration, QrVerifiedIllustration } from "@/components/custodio/illustrations";
import { colors } from "./theme";

/**
 * `/flujo` without a valid `?role=` — landed on directly (bookmark, the
 * default `next` after login/signup/Google, `/panel`'s "Nuevo trato") or via
 * the navbar's single "Empezar" CTA, which used to hardcode `?role=comprador`
 * and silently drop anyone who actually wanted to sell into the buyer flow.
 * `app/flujo/page.tsx` renders this instead of `FlujoApp` whenever the role
 * is missing/invalid, so nothing downstream ever has to guess.
 *
 * Server component, plain `<a href>` panels (no wizard state to carry) —
 * picking a role here is a real navigation to `/flujo?role=...`, which
 * `app/flujo/page.tsx` reads server-side same as ever. Reuses `PathPanel`
 * and the two illustrations `InicioStep` already uses for its own
 * "Crear el trato"/"Tengo un código" choice, rather than introducing a
 * third illustrated-panel style for what is, visually, the same kind of
 * decision one step earlier.
 */
export default function ChooseRoleScreen() {
  return (
    <div className="custodio-landing">
      <Navbar />

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "56px 20px 80px" }}>
        <StepHeading title="¿Qué querés hacer?" subtitle="El resto del trato se arma distinto según el rol que elijas." align="center" />

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <PathPanel
            href="/flujo?role=comprador"
            gradient={`linear-gradient(135deg, ${colors.brand} 0%, #1E3363 55%, #7EB6F5 130%)`}
            shadow="rgba(22,35,74,0.32)"
            title="Comprar algo"
            tagline="Tu plata queda protegida hasta que confirmes"
            illustration={<RetainedFundsIllustration />}
            illustrationSize={{ width: 108, height: 98 }}
            animationDelay="0ms"
          />
          <PathPanel
            href="/flujo?role=vendedor"
            gradient={`linear-gradient(135deg, ${colors.roleSeller} 0%, #0B4B3F 55%, #6FCDB6 130%)`}
            shadow="rgba(15,110,92,0.32)"
            title="Vender algo"
            tagline="Cobras seguro, sin riesgo de estafa"
            illustration={<QrVerifiedIllustration />}
            illustrationSize={{ width: 112, height: 82 }}
            animationDelay="80ms"
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}
