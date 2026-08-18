// ===========================================================================
// RankRentDeep OS — cron/queue auth helper
// Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We also accept a
// `x-cron-secret` header for manual/edge invocation.
// ===========================================================================

import { NextRequest } from "next/server";

export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const header = req.headers.get("x-cron-secret");
  return bearer === secret || header === secret;
}
