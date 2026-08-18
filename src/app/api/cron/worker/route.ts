import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/client";
import { claimNextJob } from "@/lib/queue";
import { processJob } from "@/lib/worker";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_SIZE = 5;

// POST — drain the job queue. Triggered by Vercel Cron every few minutes.
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  let processed = 0;

  for (let i = 0; i < BATCH_SIZE; i++) {
    const job = await claimNextJob(db);
    if (!job) break;
    await processJob(db, job);
    processed++;
  }

  return NextResponse.json({ processed });
}
