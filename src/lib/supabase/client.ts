// ===========================================================================
// RankRentDeep OS — Supabase clients
//   * browser.ts — anon key, for client components + Realtime.
//   * admin.ts   — service-role key, SERVER-ONLY, for writes in route handlers
//                 and cron jobs. Never import this from a client component.
// ===========================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Cached browser/client (anon) client. */
let browserClient: SupabaseClient<Database> | null = null;

export function getBrowserClient(): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error("Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) are missing.");
  }
  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey);
  }
  return browserClient;
}

/** Cached server (service-role) client. */
let adminClient: SupabaseClient<Database> | null = null;

export function getAdminClient(): SupabaseClient<Database> {
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase env vars (SUPABASE_SERVICE_ROLE_KEY) are missing.");
  }
  if (!adminClient) {
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}

/** True when Supabase is configured. */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
