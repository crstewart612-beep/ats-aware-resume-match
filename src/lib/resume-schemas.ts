import { z } from "zod";

/** Shared, client-safe schemas for the AI scorecard (Step 1) and rewrite (Step 2). */

const score = z.object({
  label: z.string().describe("Score on this ATS's own scale, e.g. 'B', '72%', 'Top tier', '4 / 5 stars'"),
  percent: z.number().describe("Same score mapped to 0-100 for a progress ring"),
});

const status = z.enum(["met", "partial", "missing"]);
const verdict = z.enum(["apply", "apply_with_referral", "skip"]);

export const reportSchema = z.object({
  jobTitle: z.string(),
  company: z.string().nullable(),
  summary: z.string().describe("Two warm, honest sentences on where the candidate stands"),
  scoreNow: score,
  bestPossible: score,
  cappingItem: z.string().nullable().describe("The requirement or issue that caps the score, or null"),
  afterRewriteExplanation: z.string(),
  verdict,
  verdictReasons: z.array(z.string()),
  requirements: z.array(
    z.object({
      requirement: z.string(),
      type: z.enum(["required", "preferred"]),
      classification: z.string().describe("Why it was classed required or preferred, a few words"),
      evidence: z.string().nullable().describe("Quote from the resume, or null"),
      status,
    }),
  ),
  atsChecks: z.array(
    z.object({ check: z.string(), status: z.enum(["pass", "risk", "fail"]), note: z.string() }),
  ),
  knockoutRisks: z.array(z.object({ risk: z.string(), note: z.string() })),
  gapPlan: z.array(
    z.object({
      item: z.string(),
      category: z.enum(["rewrite", "me", "not_fixable"]),
      fix: z.string(),
      timeNeeded: z.string().nullable(),
      unlocks: z.string().nullable(),
    }),
  ),
  questions: z.array(
    z.object({
      question: z.string(),
      why: z.string().describe("How a yes could raise the score"),
    }),
  ),
  rewriteWorthIt: z.object({
    worth: z.boolean(),
    reason: z.string(),
  }),
});

export const rewriteSchema = z.object({
  scoreBefore: score,
  scoreAfter: score,
  verdict,
  verdictReasons: z.array(z.string()),
  headline: z.string().describe("One encouraging sentence about the result"),
  cappingItem: z.string().nullable(),
  resumeMarkdown: z.string(),
  fileName: z.string(),
  requirements: z.array(
    z.object({
      requirement: z.string(),
      before: status,
      after: status,
      how: z.string(),
    }),
  ),
  changes: z.array(z.object({ change: z.string(), why: z.string() })),
  remainingGaps: z.array(z.object({ gap: z.string(), fastestFix: z.string() })),
  preSubmitCheck: z.array(
    z.object({ check: z.string(), status: z.enum(["pass", "fail"]), note: z.string() }),
  ),
  fieldsToDoubleCheck: z.array(z.string()),
  nextActions: z.array(z.string()),
});

export type Report = z.infer<typeof reportSchema>;
export type Rewrite = z.infer<typeof rewriteSchema>;
export type Verdict = z.infer<typeof verdict>;
export type ReqStatus = z.infer<typeof status>;

type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
export type PartialReport = DeepPartial<Report>;
export type PartialRewrite = DeepPartial<Rewrite>;

export const resumeInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("pdf"),
    name: z.string().max(300),
    size: z.number().nonnegative(),
    base64: z.string().min(10).max(8_000_000),
  }),
  z.object({
    kind: z.literal("docx"),
    name: z.string().max(300),
    size: z.number().nonnegative(),
    text: z.string().min(30).max(80_000),
    hasTables: z.boolean(),
    hasImages: z.boolean(),
  }),
  z.object({
    kind: z.literal("text"),
    name: z.string().max(300),
    text: z.string().min(30).max(80_000),
  }),
]);
export type ResumeInput = z.infer<typeof resumeInputSchema>;

export const analyzeRequestSchema = z.object({
  atsId: z.string().max(60),
  jobDescription: z.string().min(80).max(40_000),
  resume: resumeInputSchema,
});

export const rewriteRequestSchema = analyzeRequestSchema.extend({
  report: z.unknown(),
  answers: z
    .array(z.object({ question: z.string().max(1000), answer: z.string().max(3000) }))
    .max(20),
});

/** Stream events sent from the server as newline-delimited JSON. */
export type StreamEvent<T> =
  | { type: "partial"; data: T }
  | { type: "final"; data: T }
  | { type: "error"; status: number; message: string };
