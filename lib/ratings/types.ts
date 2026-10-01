import type { CreatedByRole } from "@/lib/tratos/types";

export type TratoRatingRow = {
  id: string;
  trato_id: string;
  user_id: string;
  role: CreatedByRole;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

/** What `GET`/`POST /api/tratos/[code]/rating` return — the trato being rated plus this account's rating so far. */
export type RatingResponse = {
  code: string; // display format, e.g. "ABC-123"
  item: string;
  role: CreatedByRole;
  counterpartName: string | null;
  score: number | null;
  comment: string | null;
};
