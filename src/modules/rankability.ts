// ===========================================================================
// RankRentDeep OS — Module C: SERP Rankability Intelligence
// Scrapes the SERP, classifies results, enriches domain authority, and
// computes two independent rankability models + content gap analysis.
// ===========================================================================

import type { RankabilityResult, SerpResult } from "@/core/types";
import { buildRankabilityResult } from "@/core/rankability";
import type { UnifiedSeoClient } from "@/lib/providers";

export interface RankabilityInput {
  keyword: string;
  location: string;
  targetUrl?: string;
}

const ENRICH_CONCURRENCY = 5;
const MAX_ENRICH = 10;

/**
 * Run SERP rankability analysis. Enriches the top organic results with domain
 * authority metrics (backlinks, referring domains) to feed both models.
 */
export async function runRankabilityAnalysis(
  seo: UnifiedSeoClient,
  input: RankabilityInput,
): Promise<RankabilityResult> {
  const raw = await seo.serpOverview(input.keyword, input.location);

  // Enrich the top organic results with domain authority.
  const organic = raw
    .filter((r) => r.resultType !== "ads" && r.resultType !== "image" && r.resultType !== "video")
    .slice(0, MAX_ENRICH);

  const enriched = await enrichWithConcurrency(seo, organic, ENRICH_CONCURRENCY);

  const topResults: SerpResult[] = [...raw];
  // Replace enriched entries by matching URL.
  const enrichedByUrl = new Map(enriched.map((e) => [e.url, e]));
  for (let i = 0; i < topResults.length; i++) {
    const hit = enrichedByUrl.get(topResults[i].url);
    if (hit) topResults[i] = hit;
  }

  return buildRankabilityResult({ topResults });
}

async function enrichWithConcurrency(
  seo: UnifiedSeoClient,
  results: SerpResult[],
  concurrency: number,
): Promise<SerpResult[]> {
  const out: SerpResult[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < results.length) {
      const idx = cursor++;
      const r = results[idx];
      try {
        const domain = hostOf(r.url);
        const metrics = await seo.domainRating(domain);
        if (metrics) {
          out.push({ ...r, ...metrics });
          continue;
        }
      } catch {
        // fall through to un-enriched
      }
      out.push(r);
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );
  return out;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
