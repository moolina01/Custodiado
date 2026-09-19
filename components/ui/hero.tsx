"use client"
import { useEffect, useRef, useState } from "react"
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react"
import { motion } from "framer-motion"

// Custodiado brand palette (`components/custodio/theme.ts`) — this file
// lives under shadcn's `/components/ui`, not `/components/custodio`, so
// the hex values are inlined here instead of importing `colors`, same
// tradeoff the rest of `/components/ui` accepts.
const BRAND = {
  brand: "#16234A",
  brandDark: "#0F1830",
  brandDeep: "#0B1220",
  accent: "#3B82F6",
  // Azul medio (no el `accentSoft` casi-blanco del theme) — el shader
  // pasa por este tono en vez de por blanco puro, así nunca "se lava" a
  // un frame casi blanco (pasaba con `accentSoft`/`#ffffff` acá: en
  // ciertos momentos de la animación el navbar transparente de encima
  // se veía blanco entero — reportado y confirmado con capturas).
  accentLight: "#60A5FA",
}

/**
 * Hero de Custodiado.cl: mismo mensaje y CTAs que el Hero anterior de dos
 * columnas (ver `components/custodio/Hero.tsx` en el historial de git),
 * ahora sobre un fondo de shaders animados (`@paper-design/shaders-react`)
 * en vez de paneles ilustrados estáticos.
 *
 * El componente original traía su propio `<header>` (logo + nav
 * "Features/Pricing/Docs" + botón "Login") — se sacó a pedido del
 * usuario: el sitio ya tiene su `Navbar` real arriba (`app/page.tsx`),
 * tener dos era ruido visual y funcional (dos sets de links, ninguno
 * apuntando a nada real).
 */
export default function ShaderShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  // Pasa a "activo" mientras el mouse está sobre el hero — solo acelera
  // un poco el shader de fondo (`speed` más abajo), gesto sutil de que
  // la sección reacciona.
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const handleMouseEnter = () => setIsActive(true)
    const handleMouseLeave = () => setIsActive(false)

    const container = containerRef.current
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter)
      container.addEventListener("mouseleave", handleMouseLeave)
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter)
        container.removeEventListener("mouseleave", handleMouseLeave)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id="hero"
      className="min-h-screen relative overflow-hidden"
      style={{
        background: BRAND.brandDeep,
        // Se mete debajo de `Navbar` (`components/custodio/Navbar.tsx`) en
        // vez de arrancar después: `Navbar` es `position: sticky` y vive
        // *antes* del Hero en el flujo normal, así que sin este ajuste no
        // hay overlap real en el primer frame (scroll 0) y el navbar
        // "transparente" de encima deja ver el fondo claro de la página en
        // vez de este shader. `--navbar-h` la publica `Navbar` (altura real,
        // vía `ResizeObserver`); el fallback de 60px cubre el primer paint
        // antes de que ese efecto corra, para no mostrar un salto de layout.
        marginTop: "calc(-1 * var(--navbar-h, 60px))",
      }}
    >
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="text-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Navy → azul Custodiado (antes negro/cian/naranja) — sin blanco
          puro en ninguna capa, a propósito (ver comentario de `BRAND`). */}
      <MeshGradient
        className="absolute inset-0 w-full h-full"
        colors={[BRAND.brandDeep, BRAND.brand, BRAND.accent, BRAND.brandDark, BRAND.accentLight]}
        speed={isActive ? 0.6 : 0.3}
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-50"
        colors={[BRAND.brandDeep, BRAND.accentLight, BRAND.accent, BRAND.brand]}
        speed={0.2}
      />

      <main className="absolute bottom-20 left-8 right-8 z-20 max-w-2xl">
        <div className="text-left">
          <motion.h1
            className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-none tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <motion.span
              className="block font-light text-white/90 text-4xl md:text-5xl lg:text-6xl mb-2 tracking-wider"
              style={{
                background: `linear-gradient(135deg, #ffffff 0%, ${BRAND.accent} 45%, #ffffff 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "url(#text-glow)",
              }}
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              Vende y compra
            </motion.span>
            <span className="block font-black text-white drop-shadow-2xl">sin miedo</span>
            <span className="block font-light text-white/80 italic">aunque no se conozcan.</span>
          </motion.h1>

          <motion.p
            className="text-lg font-light text-white/70 mb-8 leading-relaxed max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Custodiamos tu dinero hasta que veas el producto. Recién ahí se libera el pago — procesado por Mercado
            Pago, nunca por una cuenta nuestra.
          </motion.p>

          <motion.div
            className="flex items-center gap-4 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <motion.a
              href="/flujo?role=comprador"
              className="px-10 py-4 rounded-full text-white font-semibold text-sm transition-shadow duration-300 cursor-pointer shadow-lg hover:shadow-xl"
              style={{ background: BRAND.accent }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Soy comprador
            </motion.a>
            <motion.a
              href="/flujo?role=vendedor"
              className="px-10 py-4 rounded-full font-semibold text-sm transition-shadow duration-300 cursor-pointer shadow-lg hover:shadow-xl"
              style={{ background: "#ffffff", color: BRAND.brandDeep }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Soy vendedor
            </motion.a>
          </motion.div>
        </div>
      </main>

      <div className="absolute bottom-8 right-8 z-30">
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Azules Custodiado (antes arcoíris cian/naranja/verde/dorado) */}
          <PulsingBorder
            colors={[BRAND.accent, BRAND.brand, BRAND.accentLight, "#ffffff", BRAND.brandDeep]}
            colorBack="#00000000"
            speed={1.5}
            roundness={1}
            thickness={0.1}
            softness={0.2}
            intensity={5}
            spots={5}
            spotSize={0.1}
            pulse={0.1}
            smoke={0.5}
            smokeSize={4}
            scale={0.65}
            rotation={0}
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
            }}
          />

          {/* Rotating Text Around the Pulsing Border */}
          <motion.svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{ transform: "scale(1.6)" }}
          >
            <defs>
              <path id="circle" d="M 50, 50 m -38, 0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <text className="text-sm fill-white/80 font-medium">
              <textPath href="#circle" startOffset="0%">
                Procesado por Mercado Pago • Pago 100% seguro • Procesado por Mercado Pago • Pago 100% seguro •
              </textPath>
            </text>
          </motion.svg>
        </div>
      </div>
    </div>
  )
}
