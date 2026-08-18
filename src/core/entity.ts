// ===========================================================================
// RankRentDeep OS — Module A scoring: geographic entity resolution
// Pure functions. Given a set of disambiguated place candidates, compute the
// canonical entity, ambiguity score, confidence, and hard-reject flag.
// ===========================================================================

import type { EntityResolutionResult, PlaceCandidate } from "./types";
import { clamp100 } from "./weights";

const HARD_REJECT_CONFIDENCE = 70;

/**
 * Detect whether the candidate set represents a city-name collision
 * (two or more distinct places sharing the same name, e.g. Bellevue NE vs WA).
 */
export function detectCollision(candidates: PlaceCandidate[]): boolean {
  const byName = new Map<string, number>();
  for (const c of candidates) {
    const key = c.name.trim().toLowerCase();
    byName.set(key, (byName.get(key) ?? 0) + 1);
  }
  return [...byName.values()].some((count) => count > 1);
}

/**
 * Compute the ambiguity score (0..100) from the relative strength of the top
 * candidate vs. the runner-up. Uses relativeVolume when present, falling back
 * to population.
 */
export function computeAmbiguity(candidates: PlaceCandidate[]): number {
  if (candidates.length === 0) return 100;
  if (candidates.length === 1) return 0;

  const strength = (c: PlaceCandidate): number =>
    c.relativeVolume ?? (c.population ? Math.log10(c.population + 1) : 0);

  const sorted = [...candidates].sort((a, b) => strength(b) - strength(a));
  const top = strength(sorted[0]);
  const second = strength(sorted[1]);

  if (top <= 0) return 100; // no signal at all
  // Ratio of runner-up to top: 0 => unambiguous, 1 => fully ambiguous.
  const ratio = second / top;
  return clamp100(ratio * 100);
}

/**
 * Resolve a set of place candidates into a canonical entity + confidence.
 */
export function resolveEntity(candidates: PlaceCandidate[]): EntityResolutionResult {
  if (candidates.length === 0) {
    return {
      canonical: null,
      alternatives: [],
      ambiguityScore: 100,
      confidence: 0,
      hardReject: true,
      collisionDetected: false,
      collisionNote: "No geographic entity could be resolved.",
    };
  }

  const strength = (c: PlaceCandidate): number =>
    c.relativeVolume ?? (c.population ? Math.log10(c.population + 1) : 0);

  const sorted = [...candidates].sort((a, b) => strength(b) - strength(a));
  const canonical = sorted[0];
  const alternatives = sorted.slice(1);

  const ambiguityScore = computeAmbiguity(candidates);
  const confidence = clamp100(100 - ambiguityScore);
  const collisionDetected = detectCollision(candidates);

  let collisionNote: string | undefined;
  if (collisionDetected) {
    const names = [...new Set(candidates.map((c) => c.name))].join(", ");
    collisionNote = `Name collision detected: "${names}" resolves to multiple distinct places.`;
  }

  return {
    canonical,
    alternatives,
    ambiguityScore,
    confidence,
    hardReject: confidence < HARD_REJECT_CONFIDENCE,
    collisionDetected,
    collisionNote,
  };
}

/**
 * Convert entity confidence into the 0..100 entity score used in the final
 * weighted scorecard. Confidence below the hard-reject floor is heavily
 * penalized.
 */
export function entityScore(confidence: number): number {
  if (confidence >= HARD_REJECT_CONFIDENCE) return confidence;
  // Below the floor, scale down aggressively toward 0.
  return clamp100((confidence / HARD_REJECT_CONFIDENCE) * 50);
}
