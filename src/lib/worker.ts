// ===========================================================================
// RankRentDeep OS — research worker
// Dispatches claimed jobs to the appropriate module pipeline.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSeoClient } from "@/lib/seo";
import { runResearch } from "@/modules/orchestrate";
import { completeJob, failJob, type ClaimedJob } from "@/lib/queue";

export async function processJob(
  db: SupabaseClient<Database>,
  job: ClaimedJob,
): Promise<void> {
  try {
    switch (job.type) {
      case "research": {
        const candidateId = job.payload.candidateId as string;
        await researchCandidate(db, candidateId);
        break;
      }
      case "rescrape": {
        const candidateId = job.payload.candidateId as string;
        await rescrapeCandidate(db, candidateId);
        break;
      }
      case "recalc": {
        const candidateId = job.payload.candidateId as string;
        await researchCandidate(db, candidateId);
        break;
      }
      case "report": {
        await generateReport(db);
        break;
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    await completeJob(db, job.id);
  } catch (err) {
    await failJob(db, job.id, err instanceof Error ? err.message : String(err));
  }
}

async function researchCandidate(
  db: SupabaseClient<Database>,
  candidateId: string,
): Promise<void> {
  const { data: candidate, error } = await db
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  if (error || !candidate) throw new Error(`Candidate ${candidateId} not found`);

  await db.from("candidates").update({ status: "researching" }).eq("id", candidateId);
  await db
    .from("research_runs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("candidate_id", candidateId);

  try {
    const seo = createSeoClient(db);
    await runResearch(seo, db, {
      id: candidate.id,
      domain: candidate.domain,
      keyword: candidate.keyword,
      location: candidate.location,
    });
    await db
      .from("research_runs")
      .update({ status: "completed", finished_at: new Date().toISOString() })
      .eq("candidate_id", candidateId);
  } catch (err) {
    await db
      .from("research_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("candidate_id", candidateId);
    throw err;
  }
}

async function rescrapeCandidate(
  db: SupabaseClient<Database>,
  candidateId: string,
): Promise<void> {
  const { data: candidate } = await db
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  if (!candidate) return;

  const seo = createSeoClient(db);
  const serp = await seo.serpOverview(candidate.keyword, candidate.location);
  const target = candidate.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const match = serp.find((r) => r.url.includes(target));
  const position = match?.position ?? null;

  await db.from("feedback_events").insert({
    candidate_id: candidateId,
    date: new Date().toISOString().slice(0, 10),
    rankings: { [candidate.keyword]: position },
  });
}

async function generateReport(db: SupabaseClient<Database>): Promise<void> {
  // Reclassify candidates based on the latest feedback: for each built
  // candidate with feedback, compare predicted vs. actual and adjust status.
  const { data: candidates } = await db.from("candidates").select("*");
  if (!candidates) return;

  for (const c of candidates) {
    if (c.status !== "built") continue;
    const { data: feedback } = await db
      .from("feedback_events")
      .select("*")
      .eq("candidate_id", c.id)
      .order("date", { ascending: false })
      .limit(1);
    const latest = feedback?.[0];
    if (!latest) continue;
    // Underperforming flag: no rentals inquired + low traffic over time.
    if ((latest.rentals_inquired ?? 0) === 0 && (latest.organic_traffic ?? 0) < 30) {
      await db.from("candidates").update({ status: "parked" }).eq("id", c.id);
    }
  }
}
