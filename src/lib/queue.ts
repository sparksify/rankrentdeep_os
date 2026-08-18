// ===========================================================================
// RankRentDeep OS — job queue
// Background processing via the `jobs` table + atomic `claim_next_job` RPC.
// Cron endpoints (see /api/cron/worker) drain the queue in batches, keeping
// provider API calls within rate limits.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type JobType = "research" | "rescrape" | "recalc" | "report";

export async function enqueueJob(
  db: SupabaseClient<Database>,
  type: JobType,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.from("jobs").insert({ type, payload });
}

export async function enqueueResearch(
  db: SupabaseClient<Database>,
  candidateId: string,
): Promise<void> {
  await enqueueJob(db, "research", { candidateId });
}

export interface ClaimedJob {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
}

/**
 * Claim the next due job (types optional). Returns null if the queue is empty.
 */
export async function claimNextJob(
  db: SupabaseClient<Database>,
  types?: JobType[],
): Promise<ClaimedJob | null> {
  const { data, error } = await db.rpc("claim_next_job", {
    p_types: types ?? null,
  });
  if (error || !data || data.length === 0) return null;
  const job = data[0];
  return {
    id: job.id,
    type: job.type as JobType,
    payload: (job.payload ?? {}) as Record<string, unknown>,
  };
}

export async function completeJob(db: SupabaseClient<Database>, id: string): Promise<void> {
  await db.from("jobs").update({ status: "done", locked_at: null }).eq("id", id);
}

export async function failJob(
  db: SupabaseClient<Database>,
  id: string,
  error: string,
): Promise<void> {
  await db
    .from("jobs")
    .update({ status: "failed", locked_at: null, error })
    .eq("id", id);
}
