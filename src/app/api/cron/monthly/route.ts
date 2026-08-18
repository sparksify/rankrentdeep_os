import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { enqueueJob } from "@/lib/queue";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Monthly: enqueue a portfolio performance report + reclassification job.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  await enqueueJob(db, "report", {});
  return NextResponse.json({ queued: 1 });
}
