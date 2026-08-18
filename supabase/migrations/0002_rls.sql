-- ===========================================================================
-- RankRentDeep OS — 0002_rls.sql
-- Row Level Security.
--
-- Model:
--   * `anon` + `authenticated` can SELECT everything (read-only dashboard).
--   * `authenticated` can INSERT/UPDATE/DELETE (interactive users).
--   * `service_role` bypasses RLS entirely and is used by server route
--     handlers and cron jobs for all writes.
--
-- For a multi-tenant deployment, tighten the SELECT policies to
-- `authenticated` and add a `user_id` ownership column + `auth.uid()` checks.
-- ===========================================================================

alter table public.projects        enable row level security;
alter table public.candidates      enable row level security;
alter table public.places          enable row level security;
alter table public.demand_metrics  enable row level security;
alter table public.serp_results    enable row level security;
alter table public.businesses      enable row level security;
alter table public.scores          enable row level security;
alter table public.feedback_events enable row level security;
alter table public.research_runs   enable row level security;
alter table public.cache_entries   enable row level security;
alter table public.jobs            enable row level security;

-- ---------------------------------------------------------------------------
-- Read policies (anon + authenticated)
-- ---------------------------------------------------------------------------
create policy "read_projects"        on public.projects        for select to anon, authenticated using (true);
create policy "read_candidates"      on public.candidates      for select to anon, authenticated using (true);
create policy "read_places"          on public.places          for select to anon, authenticated using (true);
create policy "read_demand_metrics"  on public.demand_metrics  for select to anon, authenticated using (true);
create policy "read_serp_results"    on public.serp_results    for select to anon, authenticated using (true);
create policy "read_businesses"      on public.businesses      for select to anon, authenticated using (true);
create policy "read_scores"          on public.scores          for select to anon, authenticated using (true);
create policy "read_feedback_events" on public.feedback_events for select to anon, authenticated using (true);
create policy "read_research_runs"   on public.research_runs   for select to anon, authenticated using (true);
create policy "read_cache_entries"   on public.cache_entries   for select to anon, authenticated using (true);
create policy "read_jobs"            on public.jobs            for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Write policies (authenticated only; service_role bypasses RLS)
-- ---------------------------------------------------------------------------
create policy "write_projects"        on public.projects        for all to authenticated using (true) with check (true);
create policy "write_candidates"      on public.candidates      for all to authenticated using (true) with check (true);
create policy "write_places"          on public.places          for all to authenticated using (true) with check (true);
create policy "write_demand_metrics"  on public.demand_metrics  for all to authenticated using (true) with check (true);
create policy "write_serp_results"    on public.serp_results    for all to authenticated using (true) with check (true);
create policy "write_businesses"      on public.businesses      for all to authenticated using (true) with check (true);
create policy "write_scores"          on public.scores          for all to authenticated using (true) with check (true);
create policy "write_feedback_events" on public.feedback_events for all to authenticated using (true) with check (true);
create policy "write_research_runs"   on public.research_runs   for all to authenticated using (true) with check (true);
create policy "write_cache_entries"   on public.cache_entries   for all to authenticated using (true) with check (true);
create policy "write_jobs"            on public.jobs            for all to authenticated using (true) with check (true);
