import type { RatingResponse } from "@/lib/ratings/types";
import { ApiError } from "@/components/panel/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(body?.error ?? "Ocurrió un error inesperado.", response.status, body?.details);
  return body as T;
}

export function ratingRequest(code: string): Promise<RatingResponse> {
  return request<RatingResponse>(`/api/tratos/${encodeURIComponent(code)}/rating`);
}

export function saveRatingRequest(code: string, input: { score: number; comment?: string }): Promise<RatingResponse> {
  return request<RatingResponse>(`/api/tratos/${encodeURIComponent(code)}/rating`, { method: "POST", body: JSON.stringify(input) });
}
