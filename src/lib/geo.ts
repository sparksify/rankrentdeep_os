// ===========================================================================
// RankRentDeep OS — geographic helpers
// Location extraction from domains + collision detection notes.
// ===========================================================================

const COMMON_SUFFIXES = ["com", "net", "org", "co", "io", "us", "biz", "info"];

/**
 * Extract a likely location token from a domain. Splits the second-level
 * domain on hyphens/case and returns the leading token as a best guess.
 * Primary location input is preferred; this is only a fallback.
 */
export function extractLocationFromDomain(domain: string): string | null {
  const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const parts = cleaned.split(".");
  // Drop common suffixes.
  const sld = parts.filter((p) => !COMMON_SUFFIXES.includes(p)).join(".") || parts[0];
  const tokens = sld.split(/[-_]/).filter(Boolean);
  if (tokens.length === 0) return null;
  // Return the first token that isn't purely a service word.
  const serviceWords = new Set([
    "the", "best", "pro", "pros", "near", "my", "local", "top", "a1", "aaa",
  ]);
  const token = tokens.find((t) => !serviceWords.has(t) && /^[a-z]+$/.test(t));
  return token ?? null;
}

/** Parse a Google Places description like "Bellevue, WA, USA" into parts. */
export function parsePlaceDescription(description: string): {
  name: string;
  state?: string;
} {
  const parts = description.split(",").map((p) => p.trim());
  const name = parts[0] ?? description;
  const state = parts.find((p) => /^[A-Z]{2}$/.test(p)) ?? parts[1];
  return { name, state };
}
