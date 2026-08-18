// ===========================================================================
// RankRentDeep OS — generated-style Supabase Database types (hand-written).
// Regenerate with `supabase gen types typescript` if the schema changes.
// ===========================================================================

import type {
  BusinessRow,
  CandidateRow,
  CommitteeReportRow,
  DemandMetricRow,
  FeedbackEventRow,
  PlaceRow,
  ProjectRow,
  ResearchRunRow,
  ScoreRow,
  SerpResultRow,
} from "./types";

type JobRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  locked_at: string | null;
  error: string | null;
  created_at: string;
};

type CacheEntryRow = {
  key: string;
  provider: string;
  value: unknown;
  expires_at: string;
  created_at: string;
};

export type Json = unknown;

// Literal-typed relationship for every child table's `candidate_id` FK.
type CandidateRel = {
  foreignKeyName: "candidate_id_fkey";
  columns: ["candidate_id"];
  referencedRelation: "candidates";
  referencedColumns: ["id"];
};

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: Partial<ProjectRow>;
        Update: Partial<ProjectRow>;
        Relationships: [];
      };
      candidates: {
        Row: CandidateRow;
        Insert: Partial<CandidateRow>;
        Update: Partial<CandidateRow>;
        Relationships: [
          {
            foreignKeyName: "candidates_project_id_fkey";
            columns: ["project_id"];
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      places: {
        Row: PlaceRow;
        Insert: Partial<PlaceRow>;
        Update: Partial<PlaceRow>;
        Relationships: [CandidateRel];
      };
      demand_metrics: {
        Row: DemandMetricRow;
        Insert: Partial<DemandMetricRow>;
        Update: Partial<DemandMetricRow>;
        Relationships: [CandidateRel];
      };
      serp_results: {
        Row: SerpResultRow;
        Insert: Partial<SerpResultRow>;
        Update: Partial<SerpResultRow>;
        Relationships: [CandidateRel];
      };
      businesses: {
        Row: BusinessRow;
        Insert: Partial<BusinessRow>;
        Update: Partial<BusinessRow>;
        Relationships: [CandidateRel];
      };
      scores: {
        Row: ScoreRow;
        Insert: Partial<ScoreRow>;
        Update: Partial<ScoreRow>;
        Relationships: [CandidateRel];
      };
      feedback_events: {
        Row: FeedbackEventRow;
        Insert: Partial<FeedbackEventRow>;
        Update: Partial<FeedbackEventRow>;
        Relationships: [CandidateRel];
      };
      research_runs: {
        Row: ResearchRunRow;
        Insert: Partial<ResearchRunRow>;
        Update: Partial<ResearchRunRow>;
        Relationships: [CandidateRel];
      };
      committee_reports: {
        Row: CommitteeReportRow;
        Insert: Partial<CommitteeReportRow>;
        Update: Partial<CommitteeReportRow>;
        Relationships: [
          {
            foreignKeyName: "committee_reports_candidate_id_fkey";
            columns: ["candidate_id"];
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      cache_entries: {
        Row: CacheEntryRow;
        Insert: Partial<CacheEntryRow>;
        Update: Partial<CacheEntryRow>;
        Relationships: [];
      };
      jobs: {
        Row: JobRow;
        Insert: Partial<JobRow>;
        Update: Partial<JobRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cache_get: { Args: { p_key: string }; Returns: Json };
      cache_set: {
        Args: { p_key: string; p_provider: string; p_value: Json; p_ttl_seconds: number };
        Returns: undefined;
      };
      claim_next_job: {
        Args: { p_types: string[] | null };
        Returns: JobRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
