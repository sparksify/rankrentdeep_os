"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MARKET_OPTIONS = [
  { offset: 0, count: 25, label: "Top 25 metros (huge — mostly rejects)" },
  { offset: 0, count: 50, label: "Top 50 metros" },
  { offset: 50, count: 50, label: "Mid-size metros 50–100 (sweet spot)" },
  { offset: 0, count: 100, label: "All 100 metros" },
];

export function DiscoveryScanner() {
  const router = useRouter();
  const [depth, setDepth] = useState(2);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [processing, setProcessing] = useState(false);
  const [workerMsg, setWorkerMsg] = useState("");

  async function startScan() {
    setScanning(true);
    setMessage("");
    const opt = MARKET_OPTIONS[depth];
    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketCount: opt.count, marketOffset: opt.offset }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Scan failed");
      } else {
        setMessage(
          `Seeded ${json.queued} new candidates (${json.skippedDuplicates} duplicates skipped). ` +
            `They'll be researched by the worker and ranked here.`,
        );
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Network error");
    } finally {
      setScanning(false);
    }
  }

  async function processQueue() {
    setProcessing(true);
    setWorkerMsg("");
    try {
      const res = await fetch("/api/cron/worker", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setWorkerMsg(json.error ?? "Worker failed");
      } else {
        setWorkerMsg(`Processed ${json.processed} jobs. Run again to continue.`);
        router.refresh();
      }
    } catch (e) {
      setWorkerMsg(e instanceof Error ? e.message : "Network error");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Autonomous discovery scan</CardTitle>
          <CardDescription>
            Cross-joins every rank-and-rent niche against target metros, then the
            pipeline scores each one. You don't pick the city or niche — you just go.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Market depth</Label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              {MARKET_OPTIONS.map((o, i) => (
                <option key={o.label} value={i} className="bg-background">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={startScan} disabled={scanning} className="w-full">
            {scanning ? "Seeding…" : "Start discovery scan"}
          </Button>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process the queue</CardTitle>
          <CardDescription>
            On Vercel this runs automatically every 5 minutes. Locally, paste your
            CRON_SECRET and run it to research the next batch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cron-secret">CRON_SECRET</Label>
            <Input
              id="cron-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="your CRON_SECRET value"
            />
          </div>
          <Button onClick={processQueue} disabled={processing || !secret} variant="secondary" className="w-full">
            {processing ? "Processing…" : "Process next batch"}
          </Button>
          {workerMsg && <p className="text-sm text-muted-foreground">{workerMsg}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
