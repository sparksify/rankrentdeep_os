-- ===========================================================================
-- RankRentDeep OS — 0001_schema.sql
-- Core tables for the rank-and-rent research pipeline.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- candidates
-- A candidate is a single domain/keyword/location hypothesis under research.
-- ---------------------------------------------------------------------------
create table if not exists public.candidates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  domain      text not null,
  keyword     text not null,
  location    text not null,
  status      text not null default 'queued'
              check (status in ('queued','researching','scored','rejected','built','parked')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists candidates_project_idx on public.candidates(project_id);
create index if not exists candidates_status_idx on public.candidates(status);

-- ---------------------------------------------------------------------------
-- places — Module A (Geographic Entity Resolution) output
-- ---------------------------------------------------------------------------
create table if not exists public.places (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  canonical_name    text not null,
  google_place_id   text,
  latitude          double precision,
  longitude         double precision,
  county            text,
  metro             text,
  state             text,
  timezone          text,
  population        bigint,
  ambiguity_score   numeric(5,2) not null default 0,   -- 0..100
  confidence        numeric(5,2) not null default 0,  -- 0..100
  bounding_box      jsonb,
  alternative_names jsonb not null default '[]'::jsonb,
  hard_reject       boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists places_candidate_idx on public.places(candidate_id);

-- ---------------------------------------------------------------------------
-- demand_metrics — Module B (Demand Extraction) output
-- One row per (source, keyword, month, device) observation.
-- ---------------------------------------------------------------------------
create table if not exists public.demand_metrics (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  source        text not null,          -- dataforseo | ahrefs | semrush | trends
  keyword       text not null,
  volume        integer,
  confidence    numeric(5,2),           -- 0..100
  month         text,                   -- 'YYYY-MM' for seasonality rows
  device        text,                   -- 'desktop' | 'mobile' | 'all'
  intent_score  numeric(5,2),           -- commercial intent 0..100
  seasonality   jsonb,                  -- { peak, trough, curve: [{month, value}] }
  created_at    timestamptz not null default now()
);

create index if not exists demand_metrics_candidate_idx on public.demand_metrics(candidate_id);
create index if not exists demand_metrics_source_idx on public.demand_metrics(source);

-- ---------------------------------------------------------------------------
-- serp_results — Module C (SERP Rankability) output
-- One row per classified SERP result.
-- ---------------------------------------------------------------------------
create table if not exists public.serp_results (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  query          text not null,
  result_type    text not null,          -- ads | local_pack | directory | lead_gen | brand | emd | partial | video | image | paa | organic
  url            text,
  title          text,
  domain_rating  numeric(6,2),
  backlinks      bigint,
  referring_domains bigint,
  content_depth  integer,                -- word count
  last_updated   text,
  position       integer,
  collected_at   timestamptz not null default now()
);

create index if not exists serp_results_candidate_idx on public.serp_results(candidate_id);
create index if not exists serp_results_position_idx on public.serp_results(position);

-- ---------------------------------------------------------------------------
-- businesses — Module D (Rentability) output
-- Real local businesses that could rent the lead-gen site.
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id                        uuid primary key default gen_random_uuid(),
  candidate_id              uuid not null references public.candidates(id) on delete cascade,
  name                      text not null,
  address                   text,
  phone                     text,
  website                   text,
  rating                    numeric(3,2),
  review_count              integer,
  google_place_id           text,
  ads_detected              boolean not null default false,
  call_tracking_detected    boolean not null default false,
  website_quality           text,        -- 'none' | 'basic' | 'good' | 'excellent'
  marketing_budget_estimate numeric(12,2),
  source                    text,        -- google_places | yelp | bing | directory
  created_at                timestamptz not null default now()
);

create index if not exists businesses_candidate_idx on public.businesses(candidate_id);

-- ---------------------------------------------------------------------------
-- scores — Module E (Scoring Engine) output
-- Numeric columns for fast querying; jsonb columns for full detail.
-- ---------------------------------------------------------------------------
create table if not exists public.scores (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.candidates(id) on delete cascade,
  demand_score       numeric(5,2),
  rankability_score  numeric(5,2),
  rentability_score  numeric(5,2),
  entity_score       numeric(5,2),
  final_score        numeric(5,2),
  classification     text,               -- core_revenue_bet | validation_probe | learning_asset | reject
  model_agreement    text,               -- agree | disagree | high_uncertainty
  demand_details     jsonb,
  rankability_details jsonb,
  rentability_details jsonb,
  entity_details     jsonb,
  flags              jsonb not null default '[]'::jsonb,
  checklist          jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

create index if not exists scores_candidate_idx on public.scores(candidate_id);
create index if not exists scores_final_idx on public.scores(final_score);
create index if not exists scores_classification_idx on public.scores(classification);

-- ---------------------------------------------------------------------------
-- feedback_events — post-build performance tracking (active learning)
-- ---------------------------------------------------------------------------
create table if not exists public.feedback_events (
  id                uuid primary key default gen_random_uuid(),
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  date              date not null,
  rankings          jsonb,               -- { keyword: position }
  organic_traffic   integer,
  calls             integer,
  form_submissions  integer,
  rentals_inquired  integer,
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists feedback_events_candidate_idx on public.feedback_events(candidate_id);
create index if not exists feedback_events_date_idx on public.feedback_events(date);

-- ---------------------------------------------------------------------------
-- research_runs — pipeline orchestration / status tracking
-- ---------------------------------------------------------------------------
create table if not exists public.research_runs (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  status         text not null default 'queued'
                 check (status in ('queued','running','completed','failed')),
  module_results jsonb not null default '{}'::jsonb,
  error          text,
  started_at     timestamptz,
  finished_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists research_runs_candidate_idx on public.research_runs(candidate_id);
create index if not exists research_runs_status_idx on public.research_runs(status);

-- ---------------------------------------------------------------------------
-- cache_entries — provider response cache (cost + rate-limit control)
-- ---------------------------------------------------------------------------
create table if not exists public.cache_entries (
  key        text primary key,
  provider   text not null,
  value      jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cache_entries_expires_idx on public.cache_entries(expires_at);

-- ---------------------------------------------------------------------------
-- jobs — background queue (processed by cron / edge functions)
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,           -- research | rescrape | recalc | report
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
                check (status in ('queued','running','done','failed')),
  attempts      integer not null default 0,
  max_attempts  integer not null default 3,
  scheduled_for timestamptz not null default now(),
  locked_at     timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_scheduled_idx on public.jobs(scheduled_for);
