import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { enqueueResearch } from "@/lib/queue";

export const runtime = "nodejs";

// POST — batch enqueue research for existing candidates (by id).
// Body: { candidateIds: string[] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.candidateIds) ? body.candidateIds : null;
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "candidateIds is required" }, { status: 400 });
  }

  const db = getAdminClient();
  for (const id of ids) {
    await db.from("candidates").update({ status: "queued" }).eq("id", id);
    await enqueueResearch(db, id);
  }

  return NextResponse.json({ queued: ids.length });
}
