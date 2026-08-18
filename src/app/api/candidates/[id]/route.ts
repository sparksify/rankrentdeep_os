import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";

export const runtime = "nodejs";

// GET — full candidate detail (score, place, SERP, businesses, feedback).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getAdminClient();

  const [candidate, place, serp, businesses, scores, feedback, runs] = await Promise.all([
    db.from("candidates").select("*").eq("id", id).single(),
    db.from("places").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
    db.from("serp_results").select("*").eq("candidate_id", id).order("position", { ascending: true }),
    db.from("businesses").select("*").eq("candidate_id", id),
    db.from("scores").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
    db.from("feedback_events").select("*").eq("candidate_id", id).order("date", { ascending: true }),
    db.from("research_runs").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(1),
  ]);

  if (candidate.error || !candidate.data) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json({
    candidate: candidate.data,
    place: place.data?.[0] ?? null,
    serp: serp.data ?? [],
    businesses: businesses.data ?? [],
    score: scores.data?.[0] ?? null,
    feedback: feedback.data ?? [],
    run: runs.data?.[0] ?? null,
  });
}

// DELETE — remove a candidate and all associated data (cascade).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getAdminClient();
  const { error } = await db.from("candidates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
