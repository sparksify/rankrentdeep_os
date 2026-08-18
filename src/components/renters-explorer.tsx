"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessList } from "@/components/business-list";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RenterMarket } from "@/lib/queries";

const RentersMap = dynamic(() => import("@/components/renters-map").then((m) => m.RentersMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-muted-foreground">Loading map…</div>,
});

export function RentersExplorer({ markets }: { markets: RenterMarket[] }) {
  const [focusId, setFocusId] = useState<string | null>(markets[0]?.candidate.id ?? null);
  const focused = markets.find((m) => m.candidate.id === focusId) ?? markets[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-2">
        {markets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No markets with resolved places yet. Run research first.
          </p>
        ) : (
          markets.map((m) => (
            <button
              key={m.candidate.id}
              onClick={() => setFocusId(m.candidate.id)}
              className={cn(
                "w-full rounded-md border p-3 text-left transition-colors",
                m.candidate.id === focusId
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted",
              )}
            >
              <div className="font-medium">{m.place?.canonical_name}</div>
              <div className="text-xs text-muted-foreground">
                {m.candidate.keyword} · {m.businesses.length} businesses ·{" "}
                {formatCurrency(m.rentability?.rentalFloor)}–{formatCurrency(m.rentability?.rentalCeiling)}/mo
              </div>
            </button>
          ))
        )}
      </div>

      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {focused ? (
                <Link href={`/candidates/${focused.candidate.id}`} className="hover:underline">
                  {focused.place?.canonical_name} — {focused.candidate.keyword}
                </Link>
              ) : (
                "Rentability map"
              )}
            </CardTitle>
            <CardDescription>
              Blue = target market · amber = potential renters
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[420px] w-full overflow-hidden rounded-b-lg">
              <RentersMap markets={markets} focusId={focusId} />
            </div>
          </CardContent>
        </Card>

        {focused && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Potential renters in this market</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessList businesses={focused.businesses} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
