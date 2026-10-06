import { useCallback, useEffect, useState } from "react";
import { loadSeenMilestone, saveSeenMilestone } from "./persistence";

/** The milestones (`completedMilestones` counts, see ./flow) that get their own celebration moment. */
export type CelebratedMilestone = "aceptado" | "protegido";

const ACCEPTED_COUNT = 2; // "Trato aceptado"
const PROTECTED_COUNT = 4; // "Esperando pago" + "Pago protegido" flip together (see ./flow)

/**
 * Decides when to show `MilestoneCelebration` — whenever this browser sees a
 * trato reach a milestone it hadn't shown yet, whether that happened live
 * (sitting on "esperando pago" when the webhook lands) or while the tab was
 * closed (the seller comes back 30 minutes after the buyer paid). The last
 * milestone shown is remembered per trato (`saveSeenMilestone`), so a plain
 * reload after that doesn't replay it.
 *
 * Only two milestones celebrate: "Pago protegido" for both sides (real money
 * now in custody — the moment that matters most), and "Trato aceptado" only
 * for whoever created the trato (the other side is the one who just
 * accepted, celebrating their own click would be noise). "Pago liberado" has
 * its own outcome screen already ("listo"), so it doesn't need one here.
 *
 * A trato this browser has never tracked (no saved count — e.g. opened on a
 * different device) only celebrates if it's already at "Pago protegido" or
 * beyond; anything earlier is just recorded silently, so looking up a code
 * doesn't greet you with "Trato aceptado" for something you just did.
 */
export function useMilestoneCelebration(tratoCode: string | null, completedCount: number, isCreator: boolean) {
  const [celebrating, setCelebrating] = useState<CelebratedMilestone | null>(null);

  useEffect(() => {
    if (!tratoCode || completedCount === 0) return;
    const seen = loadSeenMilestone(tratoCode);
    if (seen !== null && completedCount <= seen) return;
    saveSeenMilestone(tratoCode, completedCount);

    let next: CelebratedMilestone | null = null;
    if (completedCount >= PROTECTED_COUNT && (seen === null || seen < PROTECTED_COUNT) && completedCount < 6) next = "protegido";
    else if (seen !== null && completedCount === ACCEPTED_COUNT && isCreator) next = "aceptado";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to an external store (localStorage) on a status change; there's no render-time value to derive this from.
    if (next) setCelebrating(next);
  }, [tratoCode, completedCount, isCreator]);

  // Stable, so MilestoneCelebration's auto-dismiss timer isn't restarted on every render.
  const dismiss = useCallback(() => setCelebrating(null), []);
  return { celebrating, dismiss };
}
