// ===========================================================================
// RankRentDeep OS — request validation (zod)
// ===========================================================================

import { z } from "zod";

export const candidateSchema = z.object({
  domain: z
    .string()
    .min(3, "Domain is required")
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, "Enter a valid domain (e.g. austinsprinkler.com)"),
  keyword: z.string().min(2, "Service keyword is required"),
  location: z.string().min(2, "Location is required"),
  projectId: z.string().uuid().optional(),
});

export const candidateArraySchema = z.array(candidateSchema).min(1).max(200);

export type CandidateInput = z.infer<typeof candidateSchema>;
