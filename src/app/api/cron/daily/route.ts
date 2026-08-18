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
  const { data } = await db
    .from("candidates")
    .select("id")
    .in("status", ["built", "scored"]);

  let queued = 0;
  for (const c of data ?? []) {
    await enqueueJob(db, "rescrape", { candidateId: c.id });
    queued++;
  }

  return NextResponse.json({ queued });
}
