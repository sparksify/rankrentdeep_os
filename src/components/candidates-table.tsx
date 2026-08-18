import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClassificationBadge } from "@/components/classification-badge";
import { STATUS_LABEL } from "@/lib/labels";
import { formatScore } from "@/lib/utils";
import type { CandidateWithScore } from "@/lib/queries";

function keyFlags(flags: unknown): string[] {
  if (!Array.isArray(flags)) return [];
  return flags.filter((f): f is string => typeof f === "string").slice(0, 2);
}

export function CandidatesTable({ candidates }: { candidates: CandidateWithScore[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Domain</TableHead>
          <TableHead>Keyword</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Final</TableHead>
          <TableHead>Classification</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
              No candidates yet. Add some in the Research Pipeline.
            </TableCell>
          </TableRow>
        ) : (
          candidates.map((c) => {
            const score = c.scores?.[0];
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/candidates/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.domain}
                  </Link>
                </TableCell>
                <TableCell>{c.keyword}</TableCell>
                <TableCell>{c.location}</TableCell>
                <TableCell className="text-right font-semibold">
                  {score ? formatScore(score.final_score) : "—"}
                </TableCell>
                <TableCell>
                  <ClassificationBadge classification={score?.classification} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[c.status] ?? c.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {keyFlags(score?.flags).map((f) => (
                      <Badge key={f} variant="warning" className="max-w-[180px] truncate">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
