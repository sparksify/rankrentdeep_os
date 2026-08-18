-- ===========================================================================
-- RankRentDeep OS — 0004_rpc.sql
-- Helper functions + triggers.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Keep candidates.updated_at fresh.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists candidates_touch on public.candidates;
create trigger candidates_touch
  before update on public.candidates
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Atomically claim the next due job (SKIP LOCKED avoids double-processing).
-- Returns the claimed job row, or no rows if the queue is empty.
-- ---------------------------------------------------------------------------
create or replace function public.claim_next_job(p_types text[] default null)
returns setof public.jobs
language plpgsql as $$
declare
  claimed public.jobs%rowtype;
begin
  select * into claimed
  from public.jobs
  where status = 'queued'
    and scheduled_for <= now()
    and attempts < max_attempts
    and (p_types is null or type = any(p_types))
  order by scheduled_for asc
  for update skip locked
  limit 1;

  if found then
    update public.jobs
      set status = 'running', locked_at = now(), attempts = attempts + 1
      where id = claimed.id;
    return next claimed;
  end if;
  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Upsert a cache entry (used by the provider cache layer).
-- ---------------------------------------------------------------------------
create or replace function public.cache_set(
  p_key text, p_provider text, p_value jsonb, p_ttl_seconds integer
) returns void language sql as $$
  insert into public.cache_entries (key, provider, value, expires_at)
  values (p_key, p_provider, p_value, now() + (p_ttl_seconds || ' seconds')::interval)
  on conflict (key) do update
    set provider = excluded.provider,
        value = excluded.value,
        expires_at = excluded.expires_at;
$$;

-- ---------------------------------------------------------------------------
-- Get a non-expired cache entry.
-- ---------------------------------------------------------------------------
create or replace function public.cache_get(p_key text)
returns jsonb language sql stable as $$
  select value from public.cache_entries
  where key = p_key and expires_at > now();
$$;
