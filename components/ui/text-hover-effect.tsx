"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

/**
 * Big outlined wordmark that reveals a color gradient in a spotlight
 * around the cursor on hover — ported from a shadcn-style community
 * component (originally used `motion/react` + a `cn` helper from
 * `/lib/utils`; neither exists in this project, so this uses the
 * `framer-motion` already installed and a plain className join instead).
 * Used by `Footer` as the site's closing wordmark.
 */
export function TextHoverEffect({
  text,
  duration,
  className,
}: {
  text: string
  duration?: number
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" })

  useEffect(() => {
    if (svgRef.current && cursor.x !== null && cursor.y !== null) {
      const svgRect = svgRef.current.getBoundingClientRect()
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100
      setMaskPosition({ cx: `${cxPercentage}%`, cy: `${cyPercentage}%` })
    }
  }, [cursor])

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={["select-none uppercase cursor-pointer", className].filter(Boolean).join(" ")}
    >
      <defs>
        <linearGradient id="footerTextGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#7EB6F5" />
              <stop offset="75%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="footerRevealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: "easeOut" }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="footerTextMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#footerRevealMask)" />
        </mask>
      </defs>
      {/* `textLength`/`lengthAdjust` pin the rendered word to a fixed width
          in viewBox units, independent of character count or font metrics —
          without it, `font-size` here is read as viewBox user-units (not
          screen px), so a longer word than the original demo's ("Custodiado"
          vs "Nurui") — or simply a taller wrapper, which raises the
          viewBox→screen scale factor — blew the text past the 300-unit
          viewBox and got clipped by the SVG's own box. */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="270"
        lengthAdjust="spacingAndGlyphs"
        strokeWidth="0.3"
        className="fill-transparent stroke-white/10 font-[var(--font-logo)] text-7xl font-extrabold"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="270"
        lengthAdjust="spacingAndGlyphs"
        strokeWidth="0.3"
        className="fill-transparent stroke-[#3B82F6] font-[var(--font-logo)] text-7xl font-extrabold"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
        transition={{ duration: 4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        textLength="270"
        lengthAdjust="spacingAndGlyphs"
        stroke="url(#footerTextGradient)"
        strokeWidth="0.3"
        mask="url(#footerTextMask)"
        className="fill-transparent font-[var(--font-logo)] text-7xl font-extrabold"
      >
        {text}
      </text>
    </svg>
  )
}

/**
 * Radial navy→accent glow behind `Footer`'s content. The community
 * original layered a translucent radial gradient over a *translucent*
 * footer background, so the page behind it did most of the contrast work.
 * This footer sits on an opaque navy card instead (the page behind is
 * white, not dark), so a single translucent-navy-over-navy stop was
 * invisible here — this instead paints its own light-to-dark base plus a
 * bright accent glow rising from behind the wordmark, so it reads as an
 * actual light source rather than a flat fill.
 */
export function FooterBackgroundGlow() {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        background:
          "radial-gradient(65% 55% at 50% 100%, #3B82F659 0%, #3B82F600 70%), " +
          "radial-gradient(130% 100% at 50% 0%, #1E3363 0%, #0B1220 75%)",
      }}
    />
  )
}
