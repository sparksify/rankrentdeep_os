import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { getCandidateDetail, listCandidates } from "@/lib/queries";
import { buildCandidateBrief, buildPortfolioBrief } from "@/lib/ai/brief";
import { isCommitteeConfigured, runCommittee } from "@/lib/ai/committee";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST — run the AI committee for a single candidate or the whole portfolio.
// Body: { candidateId: string } | { portfolio: true }
export async function POST(req: NextRequest) {
  if (!isCommitteeConfigured()) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const db = getAdminClient();

  try {
    let brief;
    let scope: "candidate" | "portfolio";
    let candidateId: string | null = null;

    if (body?.candidateId) {
      scope = "candidate";
      const detail = await getCandidateDetail(body.candidateId);
      if (!detail) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
      candidateId = body.candidateId;
      brief = buildCandidateBrief(detail);
    } else if (body?.portfolio) {
      scope = "portfolio";
      const candidates = await listCandidates();
      brief = buildPortfolioBrief(candidates);
    } else {
      return NextResponse.json(
        { error: "Provide either candidateId or portfolio:true." },
        { status: 400 },
      );
    }

    const report = await runCommittee(brief);

    const { data, error } = await db
      .from("committee_reports")
      .insert({
        candidate_id: candidateId,
        scope,
        status: "completed",
        model_results: report.modelResults,
        aggregate: report.aggregate,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
