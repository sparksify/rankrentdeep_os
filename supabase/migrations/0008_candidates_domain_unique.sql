-- ===========================================================================
-- RankRentDeep OS — 0008_candidates_domain_unique.sql
-- Enforce one candidate per domain so the discovery engine can idempotently
-- re-seed without creating duplicates.
-- ===========================================================================

create unique index if not exists candidates_domain_unique
  on public.candidates (domain);
