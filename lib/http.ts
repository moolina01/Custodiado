import { NextResponse } from "next/server";

/** Small, consistent JSON response shape for every Route Handler in `app/api/**`. */
export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details !== undefined ? { details } : {}) }, { status });
}
