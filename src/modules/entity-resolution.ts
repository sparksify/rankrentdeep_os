// ===========================================================================
// RankRentDeep OS — Module A: Geographic Entity Resolution
// Resolves a location string / domain to a canonical geographic entity,
// flagging city-name collisions and low-confidence resolutions.
// ===========================================================================

import type { EntityResolutionResult, PlaceCandidate } from "@/core/types";
import { resolveEntity } from "@/core/entity";
import { extractLocationFromDomain, parsePlaceDescription } from "@/lib/geo";
import type { UnifiedSeoClient } from "@/lib/providers";
import { censusLookupPlace } from "@/lib/providers/census";

export interface EntityResolutionInput {
  location: string;
  domain: string;
}

/**
 * Run geographic entity resolution. Uses Google Places autocomplete to find
 * candidate places, then resolves the canonical entity + ambiguity score.
 */
export async function runEntityResolution(
  seo: UnifiedSeoClient,
  input: EntityResolutionInput,
): Promise<EntityResolutionResult> {
  const query = input.location || extractLocationFromDomain(input.domain) || input.domain;

  if (!query) {
    return resolveEntity([]);
  }

  const predictions = await seo.placeAutocomplete(`${query}, USA`);

  if (predictions.length === 0) {
    return {
      canonical: null,
      alternatives: [],
      ambiguityScore: 100,
      confidence: 0,
      hardReject: true,
      collisionDetected: false,
      collisionNote: "No geographic entity found for the input.",
    };
  }

  // Enrich predictions with relative volume based on Google's ranking order.
  // Descending relativeVolume so computeAmbiguity reflects closeness.
  const candidates: PlaceCandidate[] = predictions.slice(0, 8).map((p, i) => {
    const parsed = parsePlaceDescription(p.name || "");
    return {
      ...p,
      name: parsed.name || p.name,
      state: p.state ?? parsed.state,
      relativeVolume: Math.max(0.05, 1 - i * 0.12),
    };
  });

  const resolved = resolveEntity(candidates);

  // Enrich the canonical entity with full details when a Google Place ID is
  // available (bounding box, county, coordinates).
  if (resolved.canonical?.googlePlaceId) {
    const details = await seo.placeDetails(resolved.canonical.googlePlaceId);
    if (details) {
      resolved.canonical = { ...details, ...resolved.canonical };
    }
  }

  // Enrich population via the US Census (key-gated; non-blocking). Improves
  // disambiguation strength when Google Places volume signals are unavailable.
  if (resolved.canonical && resolved.canonical.population == null) {
    const census = await censusLookupPlace(
      resolved.canonical.name,
      resolved.canonical.state,
    );
    if (census?.population) {
      resolved.canonical.population = census.population;
    }
  }

  return resolved;
}
