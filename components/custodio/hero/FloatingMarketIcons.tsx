"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring } from "framer-motion"

/**
 * Logos de los canales donde hoy la gente compra/vende usados a ciegas
 * (Yapo, Marketplace, WhatsApp, Instagram) — flotando de fondo en el Hero
 * para anclar el mensaje ("esto ya lo hacés, solo que sin protección") sin
 * competir con el texto ni el badge de Mercado Pago (bottom-right).
 * Puramente decorativo: `pointer-events-none` en el layer completo, así
 * nunca bloquea clicks en los CTAs de encima.
 *
 * Todos los glyphs son SVG inline a propósito (sin depender de PNG/AVIF en
 * /public): garantiza transparencia real y bordes nítidos a cualquier
 * tamaño/zoom, cosa que los assets rasterizados no daban acá.
 */

const WhatsAppGlyph = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path
      fill="#fff"
      d="M16.02 6.4c-5.3 0-9.6 4.3-9.6 9.6 0 1.7.45 3.33 1.3 4.77L6.4 25.6l4.98-1.3a9.55 9.55 0 0 0 4.64 1.18h.01c5.3 0 9.6-4.3 9.6-9.6s-4.3-9.6-9.61-9.6Zm0 17.55h-.01a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .78.8-2.93-.19-.3a7.93 7.93 0 0 1-1.22-4.23c0-4.38 3.57-7.95 7.95-7.95 4.38 0 7.94 3.57 7.94 7.95a7.95 7.95 0 0 1-7.95 7.95Zm4.36-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.39-1.32-1.63-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
    />
  </svg>
)

// Ícono de Marketplace (vidriera) — distinto del logo de Facebook a
// secas, más preciso para lo que representa. Redibujado en SVG en vez de
// usar el PNG que se pasó: ese archivo traía fondo blanco sólido (no
// transparente), por eso se veía como un rectángulo pegado encima del shader.
const MarketplaceGlyph = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <circle cx="16" cy="16" r="16" fill="#1877F2" />
    <g fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 13.5 11 9h10l2.5 4.5" />
      <path d="M7.5 13.5c0 1.5 1.15 2.6 2.5 2.6s2.5-1.1 2.5-2.6" />
      <path d="M12.5 13.5c0 1.5 1.15 2.6 2.5 2.6s2.5-1.1 2.5-2.6" />
      <path d="M17.5 13.5c0 1.5 1.15 2.6 2.5 2.6s2.5-1.1 2.5-2.6" />
      <path d="M9.5 15.6V23a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7.4" />
      <path d="M14 24v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
    </g>
  </svg>
)

// Logo de Facebook (la "f") aparte de Marketplace — se piden ambos.
const FacebookGlyph = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <circle cx="16" cy="16" r="16" fill="#1877F2" />
    <path
      fill="#fff"
      d="M18.9 16.5h-2.4V25h-3.5v-8.5h-1.7v-3h1.7v-1.9c0-2.1 1-3.9 3.9-3.9h2.5v3h-1.8c-.4 0-.9.3-.9 1.1v1.7h2.7l-.5 3Z"
    />
  </svg>
)

// Igual, redibujado en vez del .avif que se pasó: ese archivo tenía una
// cuadrícula gris "quemada" en los píxeles simulando transparencia (no
// transparencia real), así que al recortarla quedaban artefactos.
const InstagramGlyph = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full">
    <defs>
      <linearGradient id="fmi-ig-grad" gradientUnits="userSpaceOnUse" x1="0" y1="32" x2="32" y2="0">
        <stop offset="0%" stopColor="#FEE411" />
        <stop offset="25%" stopColor="#FD5949" />
        <stop offset="50%" stopColor="#D6249F" />
        <stop offset="100%" stopColor="#285AEB" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#fmi-ig-grad)" />
    <rect x="9" y="9" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="16" cy="16" r="3.6" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="21.2" cy="10.8" r="1.1" fill="#fff" />
  </svg>
)

// Isotipo real de Yapo.cl (el cubo naranja), recortado del logo que se
// pasó (`yapo.png`, wordmark completo sobre fondo blanco) — se sacó solo
// el ícono y se le quitó el fondo, dejando transparencia real, para que
// combine con el resto de marcas cuadradas del layer.
const YapoGlyph = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/yapo-icon.png" alt="Yapo" className="w-full h-full object-contain" />
)

type MarketIconDef = {
  id: string
  label: string
  className: string
  glyph: React.FC
  size: "sm" | "md" | "lg"
}

// Todos confinados al lado derecho (right-[4%] a right-[24%], top
// 12%-64%) — lejos del bloque de texto (max-w-2xl, anclado a la
// izquierda) y del badge "Procesado por Mercado Pago" (bottom-8 right-8).
// Offsets en zigzag (no una columna recta) + tamaños distintos para que
// lean como algo flotando con profundidad, no como una lista de apps.
const MARKET_ICONS: MarketIconDef[] = [
  { id: "marketplace", label: "Facebook Marketplace", className: "top-[8%] right-[8%]", glyph: MarketplaceGlyph, size: "sm" },
  { id: "whatsapp", label: "WhatsApp", className: "top-[24%] right-[26%]", glyph: WhatsAppGlyph, size: "lg" },
  { id: "facebook", label: "Facebook", className: "top-[36%] right-[5%]", glyph: FacebookGlyph, size: "sm" },
  { id: "instagram", label: "Instagram", className: "top-[54%] right-[21%]", glyph: InstagramGlyph, size: "md" },
  { id: "yapo", label: "Yapo", className: "top-[70%] right-[7%]", glyph: YapoGlyph, size: "sm" },
]

const TILE_SIZE: Record<MarketIconDef["size"], string> = {
  sm: "w-16 h-16 md:w-20 md:h-20",
  md: "w-20 h-20 md:w-24 md:h-24",
  lg: "w-24 h-24 md:w-28 md:h-28",
}

const GLYPH_SIZE: Record<MarketIconDef["size"], string> = {
  sm: "w-8 h-8 md:w-10 md:h-10",
  md: "w-10 h-10 md:w-12 md:h-12",
  lg: "w-12 h-12 md:w-14 md:h-14",
}

function FloatingIcon({
  def,
  index,
  mouseX,
  mouseY,
}: {
  def: MarketIconDef
  index: number
  mouseX: React.MutableRefObject<number>
  mouseY: React.MutableRefObject<number>
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  React.useEffect(() => {
    const handleMouseMove = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const distance = Math.hypot(mouseX.current - cx, mouseY.current - cy)

      if (distance < 140) {
        const angle = Math.atan2(mouseY.current - cy, mouseX.current - cx)
        const force = (1 - distance / 140) * 40
        x.set(-Math.cos(angle) * force)
        y.set(-Math.sin(angle) * force)
      } else {
        x.set(0)
        y.set(0)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [x, y, mouseX, mouseY])

  const Glyph = def.glyph

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute ${def.className}`}
    >
      {/* Misma chapa de vidrio que el badge "Procesado por Mercado Pago"
          y el navbar (fondo translúcido + blur + borde tenue) — el logo
          va adentro, más chico, para que se sienta sostenido por el Hero
          en vez de pegado encima. */}
      <motion.div
        className={`flex items-center justify-center ${TILE_SIZE[def.size]} rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-lg shadow-black/20`}
        animate={{
          y: [0, -10, 0, 8, 0],
          x: [0, 5, 0, -5, 0],
          rotate: [0, 3, 0, -3, 0],
        }}
        transition={{
          duration: 7 + index * 1.4,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
        aria-label={def.label}
      >
        <div className={`${GLYPH_SIZE[def.size]} drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]`}>
          <Glyph />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FloatingMarketIcons() {
  const mouseX = React.useRef(0)
  const mouseY = React.useRef(0)

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = e.clientX
      mouseY.current = e.clientY
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {MARKET_ICONS.map((def, index) => (
        <FloatingIcon key={def.id} def={def} index={index} mouseX={mouseX} mouseY={mouseY} />
      ))}
    </div>
  )
}
