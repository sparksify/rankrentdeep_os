import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { BusinessRow } from "@/lib/supabase/types";

const QUALITY_LABEL: Record<string, string> = {
  none: "No site",
  basic: "Basic",
  good: "Good",
  excellent: "Excellent",
};

export function BusinessList({ businesses }: { businesses: BusinessRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Reviews</TableHead>
          <TableHead>Website</TableHead>
          <TableHead>Ads</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {businesses.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No local businesses identified.
            </TableCell>
          </TableRow>
        ) : (
          businesses.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.address}</div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-400" />
                  {b.rating?.toFixed(1) ?? "—"}
                </span>
              </TableCell>
              <TableCell>{b.review_count ?? 0}</TableCell>
              <TableCell>
                {b.website ? (
                  <a href={b.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {QUALITY_LABEL[b.website_quality ?? ""] ?? b.website_quality}
                  </a>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell>
                {b.ads_detected ? <Badge variant="info">Ads</Badge> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{b.source ?? "—"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
