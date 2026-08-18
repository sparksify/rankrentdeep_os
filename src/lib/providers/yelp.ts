// ===========================================================================
// RankRentDeep OS — Yelp Fusion provider
// Business search for the rentability module (spec-listed source: Yelp).
// Auth: Bearer token. Base URL: https://api.yelp.com/v3
// ===========================================================================

import type { Business, PlaceCandidate, SeasonalityPoint } from "@/core/types";
import { BaseProvider, ProviderHttp } from "./base";
import type { SeoProvider } from "./types";

const BASE_URL = "https://api.yelp.com/v3";

interface YelpBusiness {
  id: string;
  name: string;
  url?: string;
  phone?: string;
  rating?: number;
  review_count?: number;
  location?: { address1?: string; city?: string; state?: string; zip_code?: string };
  coordinates?: { latitude: number; longitude: number };
}

export class YelpProvider extends BaseProvider implements SeoProvider {
  readonly name = "yelp";
  private http: ProviderHttp;

  constructor(apiKey?: string) {
    super();
    this.http = new ProviderHttp(BASE_URL, {
      bearerToken: apiKey ?? process.env.YELP_API_KEY ?? "",
    });
  }

  isConfigured(): boolean {
    return Boolean(process.env.YELP_API_KEY);
  }

  async businessSearch(location: string, keyword: string): Promise<Business[]> {
    const res = await this.http.get<{ businesses?: YelpBusiness[] }>("/businesses/search", {
      location,
      term: keyword,
      limit: "50",
    });
    return (res.businesses ?? []).map((b) => ({
      name: b.name,
      address: [b.location?.address1, b.location?.city, b.location?.state, b.location?.zip_code]
        .filter(Boolean)
        .join(", "),
      phone: b.phone,
      website: b.url,
      rating: b.rating,
      reviewCount: b.review_count ?? 0,
      latitude: b.coordinates?.latitude,
      longitude: b.coordinates?.longitude,
      googlePlaceId: undefined,
      adsDetected: false,
      callTrackingDetected: false,
      websiteQuality: b.url ? "basic" : "none",
      source: "yelp",
    }));
  }

  // Unsupported capabilities.
  async keywordVolume(): Promise<never> {
    return this.unsupported("keywordVolume");
  }
  async serpOverview(): Promise<never> {
    return this.unsupported("serpOverview");
  }
  async domainRating(): Promise<never> {
    return this.unsupported("domainRating");
  }
  async trends(): Promise<SeasonalityPoint[]> {
    return [];
  }
  async placeAutocomplete(): Promise<PlaceCandidate[]> {
    return [];
  }
  async placeDetails(): Promise<PlaceCandidate | null> {
    return null;
  }
}
