import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { enqueueJob } from "@/lib/queue";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily: enqueue a re-scrape job for every built candidate.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();

  // Built domains: re-scrape to track our own rankings (feedback loop).
  const { data: built } = await db
    .from("candidates")
    .select("id")
    .eq("status", "built");
  for (const c of built ?? []) {
    await enqueueJob(db, "rescrape", { candidateId: c.id });
  }

  // Pre-build candidates: snapshot the competitor SERP for volatility tracking.
  const { data: researching } = await db
    .from("candidates")
    .select("id")
    .in("status", ["scored", "researching"]);
  for (const c of researching ?? []) {
    await enqueueJob(db, "snapshot", { candidateId: c.id });
  }

  return NextResponse.json({ queued: (built?.length ?? 0) + (researching?.length ?? 0) });
}
