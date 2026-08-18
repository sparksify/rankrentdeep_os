"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABEL, classificationLabel, classificationVariant } from "@/lib/labels";
import { formatScore } from "@/lib/utils";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface PipelineRow {
  id: string;
  domain: string;
  keyword: string;
  location: string;
  status: string;
  scores: { final_score: number | null; classification: string | null }[] | null;
}

export function Pipeline() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [domain, setDomain] = useState("");
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [bulk, setBulk] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = useMemo(
    () => (url && anon ? createClient(url, anon) : null),
    [],
  );

  async function refresh() {
    if (!supabase) return;
    const { data } = await supabase
      .from("candidates")
      .select("*, scores(*)")
      .order("created_at", { ascending: false });
    setRows((data as PipelineRow[]) ?? []);
  }

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;

    async function load() {
      const { data } = await client
        .from("candidates")
        .select("*, scores(*)")
        .order("created_at", { ascending: false });
      if (!cancelled) setRows((data as PipelineRow[]) ?? []);
    }

    load();

    const channel = client
      .channel("pipeline-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "research_runs" }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [supabase]);

  async function submit(payload: { domain: string; keyword: string; location: string }[]) {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Failed to add candidates");
      } else {
        setMessage(`Queued ${json.count} candidate(s) for research.`);
        setDomain("");
        setKeyword("");
        setLocation("");
        setBulk("");
        await refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    if (!domain || !keyword || !location) return;
    submit([{ domain, keyword, location }]);
  }

  function onSubmitBulk() {
    const parsed = bulk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [d, k, l] = line.split(",").map((s) => s.trim());
        return { domain: d, keyword: k, location: l };
      })
      .filter((x) => x.domain && x.keyword && x.location);
    if (parsed.length === 0) return;
    submit(parsed);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add a candidate</CardTitle>
            <CardDescription>Domain, service keyword, and target location.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmitSingle} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="austinsprinkler.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="keyword">Service keyword</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="sprinkler repair"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Austin, TX"
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Queueing…" : "Run research"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk import</CardTitle>
            <CardDescription>
              One per line: <code>domain, keyword, location</code>. Handles up to 200 candidates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={8}
              placeholder={"austinsprinkler.com, sprinkler repair, Austin TX\nbellevueplumber.com, plumber, Bellevue WA"}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <Button onClick={onSubmitBulk} disabled={submitting}>
              {submitting ? "Queueing…" : "Import batch"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pipeline status</CardTitle>
          <CardDescription>Updates live via Supabase Realtime.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Keyword</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead>Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No candidates queued.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const score = r.scores?.[0];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/candidates/${r.id}`} className="font-medium text-primary hover:underline">
                          {r.domain}
                        </Link>
                      </TableCell>
                      <TableCell>{r.keyword}</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STATUS_LABEL[r.status] ?? r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {score ? formatScore(score.final_score) : "—"}
                      </TableCell>
                      <TableCell>
                        {score?.classification ? (
                          <Badge variant={classificationVariant(score.classification)}>
                            {classificationLabel(score.classification)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
