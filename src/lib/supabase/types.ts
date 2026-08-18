// ===========================================================================
// RankRentDeep OS — database row types
// Mirrors `supabase/migrations/0001_schema.sql`.
// ===========================================================================

export type CandidateStatus =
  | "queued"
  | "researching"
  | "scored"
  | "rejected"
  | "built"
  | "parked";

export type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
}

export type CandidateRow = {
  id: string;
  project_id: string | null;
  domain: string;
  keyword: string;
  location: string;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
}

export type PlaceRow = {
  id: string;
  candidate_id: string;
  canonical_name: string;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  county: string | null;
  metro: string | null;
  state: string | null;
  timezone: string | null;
  population: number | null;
  ambiguity_score: number;
  confidence: number;
  bounding_box: unknown | null;
  alternative_names: unknown[];
  hard_reject: boolean;
  created_at: string;
}

export type DemandMetricRow = {
  id: string;
  candidate_id: string;
  source: string;
  keyword: string;
  volume: number | null;
  confidence: number | null;
  month: string | null;
  device: string | null;
  intent_score: number | null;
  seasonality: unknown | null;
  created_at: string;
}

export type SerpResultRow = {
  id: string;
  candidate_id: string;
  query: string;
  result_type: string;
  url: string | null;
  title: string | null;
  domain_rating: number | null;
  backlinks: number | null;
  referring_domains: number | null;
  content_depth: number | null;
  last_updated: string | null;
  position: number | null;
  collected_at: string;
}

export type BusinessRow = {
  id: string;
  candidate_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  review_count: number | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  ads_detected: boolean;
  call_tracking_detected: boolean;
  website_quality: string | null;
  marketing_budget_estimate: number | null;
  source: string | null;
  created_at: string;
}

export type ScoreRow = {
  id: string;
  candidate_id: string;
  demand_score: number | null;
  rankability_score: number | null;
  rentability_score: number | null;
  entity_score: number | null;
  final_score: number | null;
  classification: string | null;
  model_agreement: string | null;
  demand_details: unknown | null;
  rankability_details: unknown | null;
  rentability_details: unknown | null;
  entity_details: unknown | null;
  flags: unknown[];
  checklist: Record<string, unknown>;
  created_at: string;
}

export type FeedbackEventRow = {
  id: string;
  candidate_id: string;
  date: string;
  rankings: unknown | null;
  organic_traffic: number | null;
  calls: number | null;
  form_submissions: number | null;
  rentals_inquired: number | null;
  notes: string | null;
  created_at: string;
}

export type ResearchRunRow = {
  id: string;
  candidate_id: string;
  status: "queued" | "running" | "completed" | "failed";
  module_results: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export type CommitteeReportRow = {
  id: string;
  candidate_id: string | null;
  scope: "candidate" | "portfolio";
  status: "pending" | "completed" | "failed";
  model_results: unknown[];
  aggregate: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}

export type SerpHistoryRow = {
  id: string;
  candidate_id: string;
  keyword: string;
  domains: unknown[];
  collected_at: string;
}
