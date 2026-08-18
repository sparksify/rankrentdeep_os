"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedbackSeries } from "@/lib/queries";

interface ChartPoint {
  date: string;
  traffic: number;
  calls: number;
  forms: number;
  position: number | null;
}

function toPoints(series: FeedbackSeries): ChartPoint[] {
  return series.feedback.map((f) => {
    const rankings = (f.rankings ?? {}) as Record<string, number>;
    const positions = Object.values(rankings).filter((p) => typeof p === "number");
    return {
      date: f.date,
      traffic: f.organic_traffic ?? 0,
      calls: f.calls ?? 0,
      forms: f.form_submissions ?? 0,
      position: positions.length ? Math.min(...positions) : null,
    };
  });
}

export function FeedbackCharts({ series }: { series: FeedbackSeries[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(series[0]?.candidate.id ?? null);
  const selected = series.find((s) => s.candidate.id === selectedId) ?? series[0];

  if (series.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-muted-foreground">
          No feedback events yet. Feedback is collected once domains are built and tracked.
        </CardContent>
      </Card>
    );
  }

  const points = selected ? toPoints(selected) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {series.map((s) => (
          <button
            key={s.candidate.id}
            onClick={() => setSelectedId(s.candidate.id)}
            className={
              s.candidate.id === selected?.candidate.id
                ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            }
          >
            {s.candidate.domain}
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organic traffic</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={points}>
                  <defs>
                    <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f8cff" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#4f8cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                  <XAxis dataKey="date" stroke="#8b96ad" fontSize={12} />
                  <YAxis stroke="#8b96ad" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#111a2e", border: "1px solid #1f2b45" }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="#4f8cff" fill="url(#traffic)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calls & form submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                  <XAxis dataKey="date" stroke="#8b96ad" fontSize={12} />
                  <YAxis stroke="#8b96ad" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#111a2e", border: "1px solid #1f2b45" }}
                  />
                  <Line type="monotone" dataKey="calls" stroke="#f59e0b" name="Calls" />
                  <Line type="monotone" dataKey="forms" stroke="#34d399" name="Forms" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Ranking position over time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={points}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2b45" />
                  <XAxis dataKey="date" stroke="#8b96ad" fontSize={12} />
                  <YAxis reversed domain={[1, 50]} stroke="#8b96ad" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#111a2e", border: "1px solid #1f2b45" }}
                  />
                  <Line type="monotone" dataKey="position" stroke="#4f8cff" name="Position" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
