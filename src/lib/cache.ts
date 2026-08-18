// ===========================================================================
// RankRentDeep OS — provider response cache
// Interface + in-memory and Supabase-backed implementations. Reduces redundant
// (and costly) API calls across the research pipeline.
// ===========================================================================

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

/** Simple TTL cache for dev / tests. */
export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

/**
 * Supabase-backed cache. Uses the `cache_get` / `cache_set` RPC functions
 * defined in `supabase/migrations/0004_rpc.sql`. Falls back gracefully to
 * a no-op if the client is unavailable.
 */
export class SupabaseCache implements Cache {
  constructor(
    private readonly getRpc: (key: string) => Promise<unknown>,
    private readonly setRpc: (key: string, provider: string, value: unknown, ttl: number) => Promise<void>,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.getRpc(key);
      return (value as T) ?? null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.setRpc(key, "unified", value, ttlSeconds);
    } catch {
      // cache write failures are non-fatal
    }
  }
}
