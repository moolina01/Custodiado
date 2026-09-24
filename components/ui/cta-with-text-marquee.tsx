"use client";

import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useRef } from "react";

// Adaptado a Custodiado.cl desde un componente CTA genérico (marquee
// vertical de texto) — copy, paleta y CTAs reemplazados por los reales del
// sitio en vez de dejar el placeholder "Start With One Agent" / tokens
// shadcn sin configurar (`bg-background`, `bg-secondary`, etc. no existen
// en este proyecto, ver `theme.ts` para la paleta real).
const BRAND = {
  brandDeep: "#0B1220",
  accent: "#3B82F6",
  // Fondo de la sección en prueba: blanco en vez del navy original, para
  // ver cómo queda la sección con el look claro del resto de la página.
  sectionBg: "#FFFFFF",
  muted: "#5B6B85",
};

// Pasos del flujo de custodia (mismo contenido que `FLOW_WORDS`/`ESCROW
// steps` en `data.ts`), en vez de los items de producto genéricos del
// original ("Lead capture", "Operations", ...). Cada uno trae un detalle
// corto que aparece al hacer hover, aclarando el paso desde ambos roles.
const MARQUEE_ITEMS = [
  { label: "Código del trato", detail: "Lo generas si vendes, o lo obtienes si compras." },
  { label: "Pago retenido", detail: "El comprador paga y el dinero queda en custodia." },
  { label: "Entrega en persona", detail: "Se encuentran y el vendedor entrega el producto." },
  { label: "Escaneo del QR", detail: "Ambos confirman el trato escaneando el código." },
  { label: "Pago liberado", detail: "El dinero llega al vendedor al instante." },
];

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
}

function VerticalMarquee({ children, pauseOnHover = false, reverse = false, className, speed = 30 }: VerticalMarqueeProps) {
  return (
    <div
      className={cn("group flex flex-col overflow-hidden", className)}
      style={{ "--duration": `${speed}s` } as React.CSSProperties}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

/** Closing full-screen CTA: the escrow promise as a headline, flow steps scrolling alongside. */
export default function CTAWithTextMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Ítem más cercano al centro vertical queda a opacidad completa, el resto
  // se apaga con la distancia — mismo efecto "foco" que el original.
  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll(".marquee-item");
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        (item as HTMLElement).style.opacity = (1 - normalizedDistance * 0.75).toString();
      });
    };

    let frame = requestAnimationFrame(function loop() {
      updateOpacity();
      frame = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      id="como-funciona"
      className="section-viewport relative flex items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: BRAND.sectionBg }}
    >
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="max-w-xl space-y-8">
            <h2
              className="animate-fade-in-up text-4xl leading-tight font-medium tracking-tight [animation-delay:200ms] md:text-5xl lg:text-6xl"
              style={{ color: BRAND.brandDeep }}
            >
              De una compra insegura a una compra segura, en 5 pasos.
            </h2>
            <p className="animate-fade-in-up text-lg leading-relaxed [animation-delay:400ms] md:text-xl" style={{ color: BRAND.muted }}>
              El comprador paga, el dinero queda en custodia, el vendedor entrega y ambos escanean el QR para
              liberar el pago.
            </p>
            <div className="animate-fade-in-up flex flex-wrap gap-4 [animation-delay:600ms]">
              <a
                href="/flujo?mode=crear"
                className="rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{ background: BRAND.accent }}
              >
                Crear trato seguro
              </a>
              <a
                href="/flujo?mode=codigo"
                className="rounded-full border px-8 py-3.5 text-sm font-semibold shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md"
                style={{ color: BRAND.brandDeep, borderColor: "rgba(11,18,32,0.18)" }}
              >
                Ya tengo un código
              </a>
            </div>
          </div>

          <div ref={marqueeRef} className="animate-fade-in-up relative flex h-[420px] items-center justify-center [animation-delay:400ms] lg:h-[560px]">
            <div className="relative h-full w-full">
              <VerticalMarquee speed={20} className="h-full" pauseOnHover>
                {MARQUEE_ITEMS.map((item, idx) => (
                  <div key={idx} className="marquee-item group/item py-6">
                    <div
                      className="text-3xl font-light tracking-tight transition-colors duration-300 md:text-4xl lg:text-5xl"
                      style={{ color: BRAND.brandDeep, opacity: 0.85 }}
                    >
                      {item.label}
                    </div>
                    <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-out group-hover/item:mt-2 group-hover/item:max-h-12 group-hover/item:opacity-100">
                      <p className="text-sm md:text-base" style={{ color: BRAND.muted }}>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </VerticalMarquee>

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40" style={{ background: `linear-gradient(180deg, ${BRAND.sectionBg} 0%, transparent 100%)` }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40" style={{ background: `linear-gradient(0deg, ${BRAND.sectionBg} 0%, transparent 100%)` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
