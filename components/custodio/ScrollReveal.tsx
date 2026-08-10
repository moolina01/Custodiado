"use client";

import { useEffect } from "react";

/**
 * Powers the "fade + slide up into view" effect used across every section.
 *
 * Any element rendered via `<Reveal>` gets a `data-reveal` attribute; this
 * component watches the whole page for those elements and switches them to
 * their visible state (respecting each element's `data-rd` delay) as soon
 * as they scroll into the viewport. It renders nothing — mount it once per
 * page.
 */
export default function ScrollReveal() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const reveal = (el: Element) => {
      el.setAttribute("data-revealed", "1");
      const delay = parseInt(el.getAttribute("data-rd") || "0", 10);
      const node = el as HTMLElement;
      node.style.transitionDelay = reduceMotion ? "0ms" : `${delay}ms`;

      if (el.getAttribute("data-reveal") === "line") {
        node.style.transform = "scaleX(1)";
      } else {
        node.style.opacity = "1";
        node.style.transform = "none";
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );

    // Looks for any not-yet-revealed element and starts observing it.
    // Re-run a few times shortly after mount to catch content that appears
    // after client-side hydration (e.g. inside client components).
    const scanForRevealables = () => {
      document.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (reduceMotion) reveal(el);
        else observer.observe(el);
      });
    };

    scanForRevealables();
    const timers = [150, 600, 1600].map((t) => setTimeout(scanForRevealables, t));

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return null;
}
