// ===========================================================================
// RankRentDeep OS — SEO client factory
// Builds the unified provider client backed by the Supabase response cache.
// ===========================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCache } from "@/lib/cache";
import type { Database } from "@/lib/supabase/database.types";
import { createUnifiedClient, type UnifiedSeoClient } from "@/lib/providers";

export function createSeoClient(db: SupabaseClient<Database>): UnifiedSeoClient {
  const cache = new SupabaseCache(
    async (key: string) => {
      const { data } = await db.rpc("cache_get", { p_key: key });
      return data;
    },
    async (key: string, provider: string, value: unknown, ttl: number) => {
      await db.rpc("cache_set", {
        p_key: key,
        p_provider: provider,
        p_value: value,
        p_ttl_seconds: ttl,
      });
    },
  );
  return createUnifiedClient({ cache });
}
