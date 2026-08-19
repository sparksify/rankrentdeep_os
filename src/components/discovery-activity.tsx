"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { classificationLabel, classificationVariant } from "@/lib/labels";
import { formatScore } from "@/lib/utils";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface RecentScore {
  id: string;
  final_score: number | null;
  classification: string | null;
  created_at: string;
  candidates: { domain: string; keyword: string; location: string } | null;
}

export function DiscoveryActivity() {
  const [queued, setQueued] = useState(0);
  const [researching, setResearching] = useState(0);
  const [scored, setScored] = useState(0);
  const [recent, setRecent] = useState<RecentScore[]>([]);

  const supabase = useMemo(() => (url && anon ? createClient(url, anon) : null), []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function load() {
      const [q, r, s, sc] = await Promise.all([
        client
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("status", "queued"),
        client
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("status", "researching"),
        client
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .eq("status", "scored"),
        client
          .from("scores")
          .select("id, final_score, classification, created_at, candidates(domain, keyword, location)")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;
      setQueued(q.count ?? 0);
      setResearching(r.count ?? 0);
      setScored(s.count ?? 0);
      setRecent((sc.data as unknown as RecentScore[]) ?? []);
    }

    load();

    const channel = client
      .channel("discovery-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "research_runs" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [supabase]);

  // Auto-drain the queue while there is work to do. Each call processes a
  // batch; we wait for it to finish before firing the next one (no pile-up),
  // and stop when the queue empties.
  useEffect(() => {
    if (queued === 0 && researching === 0) return;
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      try {
        await fetch("/api/cron/worker", { method: "POST" });
      } catch {
        // ignore transient failures; keep trying
      }
      if (!cancelled) setTimeout(tick, 2000);
    }
    tick();
    return () => {
      cancelled = true;
    };
  }, [queued, researching]);

  const working = researching > 0 || queued > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={
            working
              ? "h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"
              : "h-2.5 w-2.5 rounded-full bg-muted-foreground"
          }
        />
        <span className="text-sm font-medium">
          {working ? "Working…" : "Idle"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold">{queued}</div>
          <div className="text-xs text-muted-foreground">Queued</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold">{researching}</div>
          <div className="text-xs text-muted-foreground">Researching</div>
        </div>
        <div className="rounded-md border border-border p-2">
          <div className="text-lg font-semibold text-emerald-400">{scored}</div>
          <div className="text-xs text-muted-foreground">Scored</div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">Latest results</div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No results yet — process the queue and results will stream in here.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {r.candidates?.domain ?? "unknown"}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatScore(r.final_score)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {r.candidates?.keyword} · {r.candidates?.location}
                  </span>
                  {r.classification && (
                    <Badge variant={classificationVariant(r.classification)}>
                      {classificationLabel(r.classification)}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
