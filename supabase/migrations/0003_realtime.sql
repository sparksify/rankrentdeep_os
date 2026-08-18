-- ===========================================================================
-- RankRentDeep OS — 0003_realtime.sql
-- Enable Supabase Realtime for live dashboard updates.
-- ===========================================================================

alter publication supabase_realtime add table public.candidates;
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.research_runs;
alter publication supabase_realtime add table public.feedback_events;
