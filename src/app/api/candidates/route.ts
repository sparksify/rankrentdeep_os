import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { candidateArraySchema } from "@/lib/validation";
import { enqueueResearch } from "@/lib/queue";

export const runtime = "nodejs";

// GET — list candidates with their latest score.
export async function GET() {
  const db = getAdminClient();
  const { data, error } = await db
    .from("candidates")
    .select("*, scores(*)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — create candidates and enqueue research.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = candidateArraySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getAdminClient();
  const created: { id: string; domain: string; keyword: string; location: string }[] = [];

  for (const c of parsed.data) {
    const { data: candidate, error } = await db
      .from("candidates")
      .insert({
        domain: c.domain,
        keyword: c.keyword,
        location: c.location,
        project_id: c.projectId ?? null,
        status: "queued",
      })
      .select("id")
      .single();

    if (error || !candidate) continue;

    await db.from("research_runs").insert({
      candidate_id: candidate.id,
      status: "queued",
    });
    await enqueueResearch(db, candidate.id);
    created.push({ id: candidate.id, domain: c.domain, keyword: c.keyword, location: c.location });
  }

  return NextResponse.json({ created, count: created.length }, { status: 201 });
}
