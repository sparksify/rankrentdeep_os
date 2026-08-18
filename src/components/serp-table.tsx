import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { SerpResultRow } from "@/lib/supabase/types";

const TYPE_LABEL: Record<string, string> = {
  ads: "Ads",
  local_pack: "Local pack",
  directory: "Directory",
  lead_gen: "Lead-gen",
  brand: "Brand",
  emd: "Exact-match",
  partial: "Partial-match",
  video: "Video",
  image: "Image",
  paa: "PAA",
  organic: "Organic",
};

export function SerpTable({ results }: { results: SerpResultRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="text-right">DR</TableHead>
          <TableHead className="text-right">Ref. domains</TableHead>
          <TableHead className="text-right">Words</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No SERP data collected.
            </TableCell>
          </TableRow>
        ) : (
          results.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="text-muted-foreground">{r.position ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{TYPE_LABEL[r.result_type] ?? r.result_type}</Badge>
              </TableCell>
              <TableCell>
                <a
                  href={r.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-[320px] truncate text-primary hover:underline"
                >
                  {r.title || r.url}
                </a>
              </TableCell>
              <TableCell className="text-right">{formatNumber(r.domain_rating)}</TableCell>
              <TableCell className="text-right">{formatNumber(r.referring_domains)}</TableCell>
              <TableCell className="text-right">{formatNumber(r.content_depth)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
