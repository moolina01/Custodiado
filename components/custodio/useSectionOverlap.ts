"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * True while the section with `id` sits directly behind `headerRef`'s
 * element — i.e. the section's top has scrolled above the header's own
 * (live) bottom edge, but the section's bottom hasn't yet. `Navbar` uses
 * this to match its own look to whatever section is currently underneath
 * it (e.g. going transparent over the Hero's shader background) instead
 * of always reading as a plain bar regardless of what it's floating over.
 *
 * Reads `headerRef.current.getBoundingClientRect()` on every check instead
 * of taking a precomputed height, on purpose: at the very top of the page
 * the header is `position: sticky` but hasn't "stuck" yet — it's still
 * sitting below whatever renders above it (`AnnouncementBar`), so its
 * live bottom edge isn't at `headerHeight` from the viewport top, it's
 * further down. A fixed-height comparison read that as "not over the
 * section" on first load even though the header visually was — verified
 * live (`Navbar` opened white instead of transparent over the Hero).
 *
 * `initialOver` matters for the same reason: this starts `false` and only
 * flips after the effect below runs (post-mount), so a section that IS
 * overlapped on load — the Hero, always the page's first section — would
 * render wrong for a beat, then visibly animate into place through the
 * 0.35s CSS transition `Navbar` puts on `background`. Verified live: that
 * showed up as a hazy light-gray film fading over the Hero on every load.
 * Passing `true` for a section known to start overlapped skips that beat
 * entirely — both the server-rendered HTML and the first client paint
 * already read as `true`, nothing to correct after mount.
 */
export function useSectionOverlap(id: string, headerRef: RefObject<HTMLElement | null>, initialOver = false): boolean {
  const [over, setOver] = useState(initialOver);

  useEffect(() => {
    function check() {
      const el = document.getElementById(id);
      const header = headerRef.current;
      if (!el || !header) {
        setOver(false);
        return;
      }
      const sectionRect = el.getBoundingClientRect();
      const headerBottom = header.getBoundingClientRect().bottom;
      setOver(sectionRect.top <= headerBottom && sectionRect.bottom >= headerBottom);
    }
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [id, headerRef]);

  return over;
}
