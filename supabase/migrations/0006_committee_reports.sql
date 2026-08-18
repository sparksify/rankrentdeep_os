-- ===========================================================================
-- RankRentDeep OS — 0006_committee_reports.sql
-- AI committee: multiple models review a candidate/portfolio before a
-- monetary test. The committee NEVER computes scores — it receives the
-- deterministic scores as inputs and returns qualitative perspectives.
-- ===========================================================================

create table if not exists public.committee_reports (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid references public.candidates(id) on delete cascade,
  scope         text not null default 'candidate'
                check (scope in ('candidate', 'portfolio')),
  status        text not null default 'pending'
                check (status in ('pending', 'completed', 'failed')),
  model_results jsonb not null default '[]'::jsonb,
  aggregate     jsonb,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists committee_reports_candidate_idx on public.committee_reports(candidate_id);

alter table public.committee_reports enable row level security;

create policy "read_committee_reports" on public.committee_reports
  for select to anon, authenticated using (true);

create policy "write_committee_reports" on public.committee_reports
  for all to authenticated using (true) with check (true);
