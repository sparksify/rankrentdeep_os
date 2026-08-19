import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import {
  DEFAULT_MARKETS,
  DEFAULT_NICHES,
  generateCandidates,
  type Market,
} from "@/core/discovery";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST — seed an autonomous discovery scan.
// Body (optional): { niches?: string[], markets?: {city,state}[], marketCount?: number }
// Defaults to all niches × all markets (~thousands of candidates).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const db = getAdminClient();

  const niches = Array.isArray(body?.niches) && body.niches.length
    ? (body.niches as string[])
    : DEFAULT_NICHES;

  let markets: Market[] = Array.isArray(body?.markets) && body.markets.length
    ? (body.markets as Market[])
    : DEFAULT_MARKETS;

  if (typeof body?.marketCount === "number" && body.marketCount > 0) {
    markets = markets.slice(0, body.marketCount);
  }

  const specs = generateCandidates(niches, markets);

  // Group under a discovery run (a project row).
  const { data: project, error: projectError } = await db
    .from("projects")
    .insert({ name: `Discovery — ${new Date().toISOString().slice(0, 16).replace("T", " ")}` })
    .select("id")
    .single();
  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "project failed" }, { status: 500 });
  }

  const rows = specs.map((s) => ({
    project_id: project.id,
    domain: s.domain,
    keyword: s.keyword,
    location: s.location,
    status: "queued",
  }));

  const { data: inserted, error: insertError } = await db
    .from("candidates")
    .upsert(rows, { onConflict: "domain", ignoreDuplicates: true })
    .select("id");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const ids = (inserted ?? []).map((c) => c.id);
  if (ids.length > 0) {
    await db.from("research_runs").insert(ids.map((id) => ({ candidate_id: id, status: "queued" })));
    await db.from("jobs").insert(ids.map((id) => ({ type: "research", payload: { candidateId: id } })));
  }

  return NextResponse.json({
    projectId: project.id,
    queued: ids.length,
    skippedDuplicates: specs.length - ids.length,
    total: specs.length,
  });
}
