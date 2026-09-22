import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Lock, QrCode } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { colors } from "../theme";
import type { Role } from "../types";

type InicioStepProps = {
  role: Role;
  onCrear: () => void;
  onCodigo: () => void;
};

const CHECK_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const BUYER_REMINDERS = [
  "Tu plata queda retenida, el vendedor no recibe nada hasta que confirmes la entrega.",
  "Si el producto no está como esperabas, no escaneas y reclamas.",
  "Comisión 3% (mínimo $990), no hay costos escondidos.",
];

const SELLER_REMINDERS = [
  "Recibes el 100% del precio acordado, la comisión la paga el comprador.",
  'No entregas nada hasta ver el aviso de "fondos retenidos".',
  "Tus datos bancarios se piden recién cuando la plata ya está retenida.",
];

/** Landing step of the wizard: pick how to start, plus a reminder of what each role can expect. */
export default function InicioStep({ role, onCrear, onCodigo }: InicioStepProps) {
  const isBuyer = role === "comprador";
  const reminders = isBuyer ? BUYER_REMINDERS : SELLER_REMINDERS;

  return (
    <div>
      <PathChoiceHeading title="¿Cómo quieres partir?" subtitle="Crea uno nuevo, o entra con un código." />
      <div className="mx-auto mt-8 grid max-w-md grid-cols-1 gap-5 *:text-center sm:grid-cols-2">
        <PathChoiceCard
          onClick={onCrear}
          icon={Lock}
          title="Crear el trato"
          description="Tú pones el monto y compartes el código con la otra persona."
        />
        <PathChoiceCard
          onClick={onCodigo}
          icon={QrCode}
          title="Tengo un código"
          description="Alguien ya creó el trato — ingresa el código para sumarte."
        />
      </div>

      <Card
        className="flujo-fade-in"
        style={{ marginTop: "24px", background: colors.successBg, border: `1px solid ${colors.border}`, animationDelay: "180ms" }}
      >
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "14px" }}>
          Antes de partir
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {reminders.map((text) => (
            <div key={text} style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
              {CHECK_ICON}
              <div style={{ fontSize: "14.5px", color: colors.textMuted }}>{text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Plain centered "<h2>Title</h2><p>Subtitle</p>" header — the reference
 * component's own header block (`<h2>Built to cover your needs</h2><p>...`),
 * reused here by both `InicioStep` and `ChooseRoleScreen` since they share
 * the same card grid below it. This project's own `StepHeading` (used by
 * every other wizard step) is left-aligned by default and doesn't match
 * the reference's centered, larger type, hence a dedicated component
 * instead of reusing it here.
 */
export function PathChoiceHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/**
 * The reference's `CardDecorator`: a faint dotted-grid square (radial-mask
 * fade at the edges) with a smaller open-cornered box centered on top of
 * it, holding the icon. Copied as-is — it's a purely decorative wrapper,
 * nothing about it is specific to "team members" vs. this wizard's choice.
 */
function CardDecorator({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
      <div className="absolute inset-0 [--border:black] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[24px_24px] opacity-10" />
      <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border-t border-l bg-background">{children}</div>
    </div>
  );
}

type PathChoiceCardProps = {
  /** Wizard-internal choice (advances a local step) — mutually exclusive with `href`. */
  onClick?: () => void;
  /** Cross-page choice (e.g. `ChooseRoleScreen` picking `?role=`) — renders an `<a>` instead of a `<button>`. */
  href?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
};

/**
 * One tap-anywhere choice card — ported from a reference shadcn/Tailwind
 * "Features" card (flat `bg-muted` card, no border/shadow, icon in a
 * dotted-grid decorator box) into the wizard's own two-up choice. The
 * reference itself isn't interactive (three static feature blurbs); this
 * version wraps the same visual in a real `<button>`/`<a>` since each card
 * here is a navigation choice, not a description.
 *
 * `href` (vs. `onClick`) swaps the wrapper tag to an `<a>` — same visuals
 * either way, only the navigation mechanics differ. `ChooseRoleScreen`
 * uses `href` since picking a role there is a real page transition
 * (`?role=` decided server-side by `app/flujo/page.tsx`), not local
 * wizard state.
 */
export function PathChoiceCard({ onClick, href, icon: Icon, title, description }: PathChoiceCardProps) {
  const card = (
    <Card className="h-full border-0 bg-muted shadow-none transition-colors hover:bg-muted/70">
      <CardHeader className="pb-3">
        <CardDecorator>
          <Icon className="size-6" aria-hidden />
        </CardDecorator>
        <h3 className="mt-6 font-medium">{title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const wrapperClassName = "block h-full cursor-pointer rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return href ? (
    <a href={href} className={wrapperClassName}>
      {card}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cn(wrapperClassName, "w-full text-left")}>
      {card}
    </button>
  );
}
