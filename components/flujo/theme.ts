import { colors as baseColors } from "@/components/custodio/theme";

/**
 * Design tokens for the `/flujo` wizard, layered on top of the landing
 * page's shared palette so both pages stay visually consistent without
 * duplicating the brand colors.
 */
export const colors = {
  ...baseColors,

  // "Soy vendedor" role color — badge, checkmarks, teal accents. The buyer
  // equivalent is `colors.accent` (orange), already in the base palette.
  roleSeller: "#0F6E5C",
  roleSellerBg: "#E6F2EF",

  // Status surfaces specific to the wizard (deal in escrow, warnings,
  // destructive actions) that the landing page never needed.
  successBg: "#E7F1EA",
  warnBg: "#FFF6EE",
  warnBorder: "#F3D8B8",
  dangerBorder: "#E0A9A0",
  dangerText: "#B3402C",
} as const;

/** The accent color tied to whichever side of the deal is looking at the screen. */
export function roleColor(role: "comprador" | "vendedor"): string {
  return role === "comprador" ? colors.accent : colors.roleSeller;
}
