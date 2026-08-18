import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { enqueueJob } from "@/lib/queue";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Weekly: enqueue a recalc job for every active candidate.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const { data } = await db
    .from("candidates")
    .select("id")
    .not("status", "in", '("rejected","parked")');

  let queued = 0;
  for (const c of data ?? []) {
    await enqueueJob(db, "recalc", { candidateId: c.id });
    queued++;
  }

  return NextResponse.json({ queued });
}
