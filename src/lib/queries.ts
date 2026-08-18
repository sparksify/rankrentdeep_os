// ===========================================================================
// RankRentDeep OS — server-side data queries
// Used by server components to load dashboard data directly from Supabase.
// ===========================================================================

import { getAdminClient } from "@/lib/supabase/client";
import type {
  BusinessRow,
  CandidateRow,
  CommitteeReportRow,
  FeedbackEventRow,
  PlaceRow,
  ScoreRow,
  SerpResultRow,
} from "@/lib/supabase/types";

export interface CandidateWithScore extends CandidateRow {
  scores: ScoreRow[] | null;
}

export interface CandidateDetail {
  candidate: CandidateRow;
  place: PlaceRow | null;
  serp: SerpResultRow[];
  businesses: BusinessRow[];
  score: ScoreRow | null;
  feedback: FeedbackEventRow[];
}

export async function listCandidates(): Promise<CandidateWithScore[]> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("candidates")
    .select("*, scores(*)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CandidateWithScore[];
}

export async function getCandidateDetail(id: string): Promise<CandidateDetail | null> {
  const db = getAdminClient();
  const { data: candidate } = await db.from("candidates").select("*").eq("id", id).single();
  if (!candidate) return null;

  const [place, serp, businesses, score, feedback] = await Promise.all([
    db.from("places").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
    db.from("serp_results").select("*").eq("candidate_id", id).order("position", { ascending: true }),
    db.from("businesses").select("*").eq("candidate_id", id),
    db.from("scores").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
    db.from("feedback_events").select("*").eq("candidate_id", id).order("date", { ascending: true }),
  ]);

  return {
    candidate,
    place: place.data?.[0] ?? null,
    serp: serp.data ?? [],
    businesses: businesses.data ?? [],
    score: score.data?.[0] ?? null,
    feedback: feedback.data ?? [],
  };
}

export async function listDisagreements(): Promise<CandidateWithScore[]> {
  const db = getAdminClient();
  const { data } = await db
    .from("candidates")
    .select("*, scores(*)")
    .order("created_at", { ascending: false });
  if (!data) return [];

  return (data as CandidateWithScore[]).filter((c) => {
    const s = c.scores?.[0];
    if (!s) return false;
    const ra = (s.rankability_details as { modelAScore?: number; modelBScore?: number } | null) ?? {};
    const a = ra.modelAScore ?? 0;
    const b = ra.modelBScore ?? 0;
    const modelDisagree = Math.abs(a - b) > 15;
    const demandConflict = (s.demand_details as { sourceConflict?: boolean } | null)?.sourceConflict ?? false;
    return modelDisagree || demandConflict;
  });
}

export interface RenterMarket {
  candidate: CandidateRow;
  place: PlaceRow | null;
  businesses: BusinessRow[];
  rentability: {
    potentialRenters?: number;
    leadValue?: number;
    rentalFloor?: number;
    rentalCeiling?: number;
  } | null;
}

export async function listRenterMarkets(): Promise<RenterMarket[]> {
  const db = getAdminClient();
  const { data: candidates } = await db
    .from("candidates")
    .select("*, scores(*)")
    .order("created_at", { ascending: false });
  if (!candidates) return [];

  const markets: RenterMarket[] = [];
  for (const c of candidates as CandidateWithScore[]) {
    const [place, businesses] = await Promise.all([
      db.from("places").select("*").eq("candidate_id", c.id).limit(1),
      db.from("businesses").select("*").eq("candidate_id", c.id),
    ]);
    if (!place.data?.[0]) continue;
    markets.push({
      candidate: c,
      place: place.data[0],
      businesses: businesses.data ?? [],
      rentability: (c.scores?.[0]?.rentability_details as RenterMarket["rentability"]) ?? null,
    });
  }
  return markets;
}

export interface FeedbackSeries {
  candidate: CandidateRow;
  feedback: FeedbackEventRow[];
}

export async function listFeedbackSeries(): Promise<FeedbackSeries[]> {
  const db = getAdminClient();
  const { data: candidates } = await db
    .from("candidates")
    .select("*")
    .in("status", ["built", "parked", "scored"]);
  if (!candidates) return [];

  const series: FeedbackSeries[] = [];
  for (const c of candidates) {
    const { data } = await db
      .from("feedback_events")
      .select("*")
      .eq("candidate_id", c.id)
      .order("date", { ascending: true });
    if (data && data.length > 0) series.push({ candidate: c, feedback: data });
  }
  return series;
}

export async function listCommitteeReports(
  scope: "candidate" | "portfolio",
  candidateId?: string,
): Promise<CommitteeReportRow[]> {
  const db = getAdminClient();
  let query = db.from("committee_reports").select("*").eq("scope", scope);
  if (candidateId) query = query.eq("candidate_id", candidateId);
  const { data } = await query.order("created_at", { ascending: false }).limit(5);
  return (data ?? []) as CommitteeReportRow[];
}
