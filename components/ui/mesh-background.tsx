"use client"

import { useEffect, useRef, useState } from "react"
import { MeshGradient } from "@paper-design/shaders-react"

// Custodiado brand palette — same values as `Hero`'s (see that file's
// comment for why they're inlined here instead of importing `theme.ts`).
const BRAND = {
  brand: "#16234A",
  brandDark: "#0F1830",
  brandDeep: "#0B1220",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
}

/**
 * The Hero's animated mesh-gradient shader background, pulled out so
 * `Footer` can reuse the exact same visual instead of approximating it with
 * a static CSS gradient — the user asked for "the same background as the
 * Hero." `Hero` (`components/ui/hero.tsx`) also renders this now, so the
 * two sections stay visually identical instead of drifting apart over time.
 */
export function MeshBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
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
    <div ref={containerRef} className={["absolute inset-0 overflow-hidden", className].filter(Boolean).join(" ")}>
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={[BRAND.brandDeep, BRAND.brand, BRAND.accent, BRAND.brandDark, BRAND.accentLight]}
        speed={isActive ? 0.6 : 0.3}
      />
      <MeshGradient
        className="absolute inset-0 h-full w-full opacity-50"
        colors={[BRAND.brandDeep, BRAND.accentLight, BRAND.accent, BRAND.brand]}
        speed={0.2}
      />
    </div>
  )
}
