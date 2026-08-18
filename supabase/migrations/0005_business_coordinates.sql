-- ===========================================================================
-- RankRentDeep OS — 0005_business_coordinates.sql
-- Add coordinates to businesses for the Rentability Explorer map view.
-- ===========================================================================

alter table public.businesses
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
