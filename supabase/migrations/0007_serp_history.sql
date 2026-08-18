-- ===========================================================================
-- RankRentDeep OS — 0007_serp_history.sql
-- Daily competitor-SERP snapshots used to compute SERP volatility (a
-- rankability signal: high churn => incumbents are unstable => easier to rank).
-- ===========================================================================

create table if not exists public.serp_history (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  keyword      text not null,
  domains      jsonb not null default '[]'::jsonb, -- top-10 domains
  collected_at timestamptz not null default now()
);

create index if not exists serp_history_candidate_idx on public.serp_history(candidate_id);
create index if not exists serp_history_collected_idx on public.serp_history(collected_at);

alter table public.serp_history enable row level security;

create policy "read_serp_history" on public.serp_history
  for select to anon, authenticated using (true);

create policy "write_serp_history" on public.serp_history
  for all to authenticated using (true) with check (true);
