// ===========================================================================
// RankRentDeep OS — Nominatim (OpenStreetMap) geocoder
// Free, key-less geocoding. Used as a fallback for geographic entity
// resolution when Google Places is not configured. Also supplies bounding
// boxes (city / neighborhood polygons) for Module A.
// ===========================================================================

import type { PlaceCandidate, PlaceType } from "@/core/types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  boundingbox: [string, string, string, string];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    neighbourhood?: string;
    suburb?: string;
  };
}

function mapType(type: string, cls: string): PlaceType {
  if (type === "neighbourhood" || type === "suburb") return "neighborhood";
  if (type === "postcode") return "zip";
  if (type === "county") return "county";
  if (type === "city" || type === "town" || type === "village") return "city";
  if (cls === "boundary" && type === "administrative") return "city";
  return "city";
}

export async function nominatimGeocode(query: string): Promise<PlaceCandidate[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim's usage policy requires a descriptive User-Agent.
        "User-Agent": `RankRentDeepOS/0.1 (${process.env.NOMINATIM_EMAIL ?? "research@rankrentdeep.local"})`,
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];

    return data.map((r, i) => ({
      name: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.display_name.split(",")[0],
      state: r.address?.state,
      county: r.address?.county,
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      type: mapType(r.type, r.class),
      boundingBox: {
        south: Number(r.boundingbox[0]),
        north: Number(r.boundingbox[1]),
        west: Number(r.boundingbox[2]),
        east: Number(r.boundingbox[3]),
      },
      // Descending prominence based on search ranking, for disambiguation.
      relativeVolume: Math.max(0.05, 1 - i * 0.12),
      googlePlaceId: undefined,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
