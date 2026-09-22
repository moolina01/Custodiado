import Navbar from "@/components/custodio/Navbar";
import Footer from "@/components/custodio/Footer";
import { PathChoiceCard, PathChoiceHeading } from "./steps/InicioStep";
import { Banknote, ShieldCheck } from "lucide-react";

/**
 * `/flujo` without a valid `?role=` — landed on directly (bookmark, the
 * default `next` after login/signup/Google, `/panel`'s "Nuevo trato") or via
 * the navbar's single "Empezar" CTA, which used to hardcode `?role=comprador`
 * and silently drop anyone who actually wanted to sell into the buyer flow.
 * `app/flujo/page.tsx` renders this instead of `FlujoApp` whenever the role
 * is missing/invalid, so nothing downstream ever has to guess.
 *
 * Server component, plain `<a href>` cards (no wizard state to carry) —
 * picking a role here is a real navigation to `/flujo?role=...`, which
 * `app/flujo/page.tsx` reads server-side same as ever. Reuses
 * `PathChoiceCard`/`PathChoiceHeading` from `InicioStep` for its own
 * "Crear el trato"/"Tengo un código" choice, rather than introducing a
 * third card style for what is, visually, the same kind of decision one
 * step earlier.
 */
export default function ChooseRoleScreen() {
  return (
    <div className="custodio-landing">
      <Navbar />

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "56px 20px 80px" }}>
        <PathChoiceHeading title="¿Qué querés hacer?" subtitle="El resto del trato se arma distinto según el rol que elijas." />
        <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-5 *:text-center sm:grid-cols-2">
          <PathChoiceCard
            href="/flujo?role=comprador"
            icon={ShieldCheck}
            title="Comprar algo"
            description="Tu plata queda protegida hasta que confirmes la entrega."
          />
          <PathChoiceCard
            href="/flujo?role=vendedor"
            icon={Banknote}
            title="Vender algo"
            description="Cobras seguro, sin riesgo de estafa."
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}
