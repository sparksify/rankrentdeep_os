// ===========================================================================
// RankRentDeep OS — Google Places provider
// Place resolution, autocomplete, and business search (Modules A & D).
// ===========================================================================

import type {
  Business,
  PlaceCandidate,
  PlaceType,
} from "@/core/types";
import { BaseProvider, ProviderHttp } from "./base";
import type { SeoProvider } from "./types";

const BASE_URL = "https://maps.googleapis.com/maps/api";

interface PlacesAutocompleteResponse {
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: { main_text: string; secondary_text: string };
    types?: string[];
  }>;
}

interface PlacesDetailsResponse {
  result?: {
    name: string;
    place_id: string;
    geometry?: { location: { lat: number; lng: number }; viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    } };
    address_components?: AddressComponent[];
    types?: string[];
  };
}

interface PlacesTextSearchResponse {
  results?: Array<{
    name: string;
    place_id: string;
    formatted_address?: string;
    geometry?: { location: { lat: number; lng: number } };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
  }>;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function component(
  components: AddressComponent[] | undefined,
  type: string,
): string | undefined {
  return components?.find((c) => c.types.includes(type))?.long_name;
}

function inferPlaceType(types: string[] | undefined): PlaceType {
  if (!types) return "city";
  if (types.includes("neighborhood")) return "neighborhood";
  if (types.includes("postal_code")) return "zip";
  if (types.includes("administrative_area_level_2")) return "county";
  if (types.includes("locality")) return "city";
  return "city";
}

export class GooglePlacesProvider extends BaseProvider implements SeoProvider {
  readonly name = "google_places";
  private http: ProviderHttp;

  constructor(apiKey?: string) {
    super();
    this.http = new ProviderHttp(BASE_URL, {});
    this.apiKey = apiKey ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
  }

  private apiKey: string;

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  private keyParam(): Record<string, string> {
    return { key: this.apiKey };
  }

  async placeAutocomplete(query: string): Promise<PlaceCandidate[]> {
    const res = await this.http.get<PlacesAutocompleteResponse>(
      "/place/autocomplete/json",
      { input: query, ...this.keyParam() },
    );
    return (res.predictions ?? []).map((p) => ({
      name: p.structured_formatting?.main_text ?? p.description,
      googlePlaceId: p.place_id,
      type: inferPlaceType(p.types),
    }));
  }

  async placeDetails(placeId: string): Promise<PlaceCandidate | null> {
    const res = await this.http.get<PlacesDetailsResponse>(
      "/place/details/json",
      {
        place_id: placeId,
        fields:
          "name,place_id,geometry,address_components,types,formatted_address",
        ...this.keyParam(),
      },
    );
    const r = res.result;
    if (!r) return null;
    const components = r.address_components ?? [];
    return {
      name: r.name,
      googlePlaceId: r.place_id,
      latitude: r.geometry?.location.lat,
      longitude: r.geometry?.location.lng,
      county: component(components, "administrative_area_level_2"),
      state: component(components, "administrative_area_level_1"),
      type: inferPlaceType(r.types),
      boundingBox: r.geometry?.viewport
        ? {
            north: r.geometry.viewport.northeast.lat,
            south: r.geometry.viewport.southwest.lat,
            east: r.geometry.viewport.northeast.lng,
            west: r.geometry.viewport.southwest.lng,
          }
        : undefined,
    };
  }

  async businessSearch(location: string, keyword: string): Promise<Business[]> {
    const res = await this.http.get<PlacesTextSearchResponse>(
      "/place/textsearch/json",
      { query: `${keyword} in ${location}`, ...this.keyParam() },
    );
    return (res.results ?? []).map((b) => ({
      name: b.name,
      address: b.formatted_address,
      googlePlaceId: b.place_id,
      rating: b.rating,
      reviewCount: b.user_ratings_total ?? 0,
      latitude: b.geometry?.location.lat,
      longitude: b.geometry?.location.lng,
      adsDetected: false,
      callTrackingDetected: false,
      websiteQuality: "none",
      source: "google_places",
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
  async trends(): Promise<never> {
    return this.unsupported("trends");
  }
}
