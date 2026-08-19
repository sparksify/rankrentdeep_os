"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const MARKET_OPTIONS = [
  { offset: 0, count: 50, label: "Top 50 metros (huge — EMDs mostly taken)" },
  { offset: 50, count: 100, label: "Mid-size metros 50–150 (recommended)" },
  { offset: 150, count: 100, label: "Smaller metros 150–250" },
  { offset: 0, count: 1000, label: "All markets" },
];

export function DiscoveryScanner() {
  const router = useRouter();
  const [depth, setDepth] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

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
            `Research is running automatically — watch the Live activity panel.`,
        );
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Network error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autonomous discovery scan</CardTitle>
        <CardDescription>
          Cross-joins every rank-and-rent niche against target metros, then the
          pipeline scores each one automatically. You don't pick the city or
          niche — you just hit go.
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
  );
}
