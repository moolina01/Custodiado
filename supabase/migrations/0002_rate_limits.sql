-- Fixed-window rate limiting, backed by Postgres so it works correctly
-- across multiple serverless instances (unlike an in-memory Map, which
-- would reset per-instance and give a false sense of protection).
--
-- This is a pragmatic MVP stopgap, not a hard guarantee: the read-then-write
-- in lib/rateLimit.ts has a small race window under concurrent requests
-- from the same key, so a burst can occasionally exceed the limit by a
-- couple of requests. Good enough to make brute-forcing a 6-character trato
-- code infeasible; a real production deployment should move to a proper
-- rate limiter (Vercel Firewall, Upstash/Redis) instead.

create table rate_limit_hits (
  bucket_key   text not null,
  window_start timestamptz not null,
  count        integer not null default 1,
  primary key (bucket_key, window_start)
);

alter table rate_limit_hits enable row level security;
-- Same deny-all-by-default stance as `tratos` — only the service-role key (server-side) touches this.
