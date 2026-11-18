import { createAnthropic } from "@ai-sdk/anthropic";
import { APICallError, NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod";

import { findAts } from "@/data/ats";
import { ATS_RULES, UNIVERSAL_RULES } from "@/lib/ats-rules.server";
import {
  FREE_MONTHLY_REWRITES,
  FREE_MONTHLY_SCORES,
  rewriteAllowed,
  scoreAllowed,
} from "@/lib/entitlements";
import { createLovableAiGatewayRunIdFetch, withLovableAiGatewayRunIdHeader } from "@/lib/run-id.server";
import {
  analyzeRequestSchema,
  reportSchema,
  rewriteRequestSchema,
  rewriteSchema,
  type ResumeInput,
} from "@/lib/resume-schemas";
import { readSession, recordUsage } from "@/lib/session.server";

const MODEL = "anthropic/claude-sonnet-5";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

const SCORE_MAPPING = `Map the score to 0-100 for the "percent" field so it can be drawn as a ring:
- Letter grades: A=92, B=75, C=50, D=20.
- Tiers/bands: Top/Strong=88, Middle/Good/Moderate=62, Low/Weak=30.
- Star ratings (1-5): stars x 20.
- Criteria counts (e.g. Ashby): Meets / total criteria x 100.
- Percent or 0-100 scales: use the number itself.`;

function atsContext(atsId: string) {
  const ats = findAts(atsId);
  if (!ats) return null;
  const rules = ATS_RULES[atsId];
  return {
    ats,
    text: [
      `HIRING SYSTEM: ${ats.name} (${ats.vendor})`,
      `UNIVERSAL RULES\n${UNIVERSAL_RULES}`,
      rules
        ? rules.specifics
        : "UNKNOWN SYSTEM SPECIFICS\n- The candidate doesn't know which ATS the employer uses. Apply the universal rules and assume medium-high parsing strictness.",
      `PARSING STRICTNESS: ${ats.strictness}`,
      `WHAT IT LOOKS FOR: ${ats.looksFor}`,
      `HOW SCORING WORKS: ${ats.howScoring}`,
      `CAN IT AUTO-REJECT: ${ats.autoReject}`,
      `SCORE SCALE: ${ats.scale}`,
      `CONSISTENCY RULE: apply the scale's caps strictly. Any Missing REQUIRED item must lower the score, and a likely knockout must be flagged as a possible automatic rejection. Name the item that caps the score.`,
      SCORE_MAPPING,
    ].join("\n\n"),
    strategies: rules?.strategies ?? "",
  };
}

const TONE = `VOICE: You are ResumeMatch, a warm, honest career coach. Speak to the job seeker as "you", in short plain sentences. Be encouraging but never inflate scores. No buzzwords, no long paragraphs. Never use em-dashes (—) or en-dashes as punctuation; use commas, periods or colons instead. For date ranges write "MM/YYYY - MM/YYYY" with a plain hyphen.`;

function today() {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `TODAY'S DATE: ${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}. Any date on or before today is in the past, not the future. Do not flag past dates (including recent ones) as future or impossible. "Present" or "Current" means an ongoing role. Only flag a date that is truly after today.`;
}

function resumeParts(resume: ResumeInput): ModelMessage["content"] {
  if (resume.kind === "pdf") {
    return [
      {
        type: "text",
        text: `MY RESUME (attached PDF "${resume.name}", ${(resume.size / 1024).toFixed(0)} KB). Judge layout from the PDF itself (columns, tables, graphics, header/footer placement).`,
      },
      { type: "file", data: resume.base64, mediaType: "application/pdf", filename: resume.name },
    ] as ModelMessage["content"];
  }
  if (resume.kind === "docx") {
    return [
      {
        type: "text",
        text: `MY RESUME (Word file "${resume.name}", ${(resume.size / 1024).toFixed(0)} KB). Text extracted from the body of the document below. Contains tables: ${resume.hasTables ? "YES" : "no"}. Contains images: ${resume.hasImages ? "YES" : "no"}. Note: text inside Word headers/footers was not extracted - if contact details are missing from the body, flag that they may be in the header/footer (a parsing risk).\n\n<resume>\n${resume.text}\n</resume>`,
      },
    ];
  }
  return [
    {
      type: "text",
      text: `MY RESUME (pasted as plain text, so file type, size and layout can't be checked - mark those checks as "risk" with a note to verify).\n\n<resume>\n${resume.text}\n</resume>`,
    },
  ];
}

type Gateway = ReturnType<typeof createLovableAiGatewayRunIdFetch>;

function errorFrom(error: unknown): { status: number; message: string } {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 500;
    let message = "";
    try {
      const body = JSON.parse(error.responseBody ?? "{}");
      message = body?.message ?? body?.error?.message ?? "";
    } catch {
      message = "";
    }
    if (status === 402)
      return { status, message: message || "AI credits have run out. Add credits to keep scoring resumes." };
    if (status === 429)
      return { status, message: "We're a little busy right now. Please wait a minute and try again." };
    if (status === 403)
      return { status, message: message || "The AI service declined this request." };
    if (status === 400)
      return { status, message: "The AI couldn't read this request. Try a smaller file or paste your resume as text." };
    return { status, message: message || "The AI service had a hiccup. Please try again in a moment." };
  }
  if (NoObjectGeneratedError.isInstance(error)) {
    return { status: 502, message: "The AI's answer came back incomplete. Please try again." };
  }
  if (error instanceof Error && error.name === "AbortError") {
    return { status: 499, message: "Stopped." };
  }
  return { status: 500, message: "Something went wrong while scoring. Please try again." };
}

/** Streams partial objects as NDJSON so the report fills in live. */
function streamObject<S extends z.ZodTypeAny>(opts: {
  request: Request;
  schema: S;
  system: string;
  messages: ModelMessage[];
  maxOutputTokens: number;
  /** Runs once the answer is complete and delivered, so a failed call is never charged. */
  onDone?: () => Promise<unknown> | void;
}) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) {
    return Response.json({ type: "error", status: 500, message: "The AI service isn't configured yet." }, { status: 500 });
  }
  const gateway: Gateway = createLovableAiGatewayRunIdFetch();
  const anthropic = createAnthropic({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: gateway.fetch,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ type: "ping" });
      let streamError: unknown = null;
      try {
        const result = streamText({
          model: anthropic(MODEL),
          system: opts.system,
          messages: opts.messages,
          maxOutputTokens: opts.maxOutputTokens,
          maxRetries: 0,
          abortSignal: opts.request.signal,
          output: Output.object({ schema: opts.schema }),
          providerOptions: { anthropic: { effort: "medium" } },
          onError: ({ error }) => {
            streamError = error;
          },
        });

        let last = 0;
        for await (const partial of result.partialOutputStream) {
          const now = Date.now();
          if (now - last > 350) {
            last = now;
            send({ type: "partial", data: partial });
          }
        }
        if (streamError) throw streamError;
        const finishReason = await result.finishReason;
        if (finishReason === "content-filter") {
          send({ type: "error", status: 422, message: "The AI declined to review this content." });
          return;
        }
        const output = await result.output;
        send({ type: "final", data: output });
        await opts.onDone?.();
      } catch (error) {
        const err = errorFrom(streamError ?? error);
        console.error("AI request failed", err.status, streamError ?? error);
        send({ type: "error", ...err });
      } finally {
        controller.close();
      }
    },
  });

  return withLovableAiGatewayRunIdHeader(
    new Response(body, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    }),
    gateway,
    undefined,
    { waitForUpstreamHeaders: false },
  );
}

async function parseBody<S extends z.ZodTypeAny>(request: Request, schema: S) {
  try {
    const parsed = schema.safeParse(await request.json());
    return parsed.success ? (parsed.data as z.infer<S>) : null;
  } catch {
    return null;
  }
}

const badRequest = (message: string) => Response.json({ type: "error", status: 400, message }, { status: 400 });

/** Anonymous visitors get this; the app shows the sign-in screen instead of a score. */
const signInRequired = () =>
  Response.json(
    {
      type: "error",
      status: 401,
      code: "sign_in",
      message: "Please sign in to score your resume. Creating an account is free.",
    },
    { status: 401 },
  );

/** Free allowance used up; the app offers the paid plan instead of running the AI. */
const planRequired = (message: string) =>
  Response.json(
    { type: "error", status: 402, code: "plan_required", message },
    { status: 402 },
  );

/** Refuses the request unless the caller is signed in and still within their allowance. */
async function gate(request: Request, kind: "score" | "rewrite") {
  const session = await readSession(request);
  if (!session) return { session: null as null, denied: signInRequired() };
  const allowed = kind === "score" ? scoreAllowed(session.entitlement) : rewriteAllowed(session.entitlement);
  if (!allowed) {
    const denied =
      kind === "score"
        ? planRequired(
            `You've used your ${FREE_MONTHLY_SCORES} free score reports this month. A plan unlocks unlimited reports.`,
          )
        : planRequired(
            `You've used your ${FREE_MONTHLY_REWRITES} free rewrite this month. A plan unlocks unlimited rewrites.`,
          );
    return { session: null as null, denied };
  }
  return { session, denied: null as Response | null };
}

export async function handleAnalyze(request: Request) {
  const access = await gate(request, "score");
  if (access.denied) return access.denied;
  const input = await parseBody(request, analyzeRequestSchema);
  if (!input) return badRequest("Please add a job description (at least a few lines) and your resume.");
  const ctx = atsContext(input.atsId);
  if (!ctx) return badRequest("Please choose a hiring system.");

  const system = `${TONE}

${today()}

${ctx.text}

TASK: STEP 1 - PRE-APPLICATION SCORECARD. Do not rewrite anything. Evaluate the resume exactly as it is now against the job description and this hiring system.
- requirements: list EVERY required and preferred qualification, duty, hard skill, tool, certification and years-of-experience figure from the job description. Use rule 10 to classify required vs preferred and say why in "classification". Quote resume evidence verbatim (short) or null.
- atsChecks: Pass / Risk / Fail for single column, contact info in body, standard headings, date format, file type and size, tables/graphics, plus anything specific to this system.
- knockoutRisks: likely knockout questions (work authorization, years of experience, degree, license, location, schedule, salary) where the candidate could be auto-rejected. Empty if none.
- scoreNow and bestPossible on this system's scale (bestPossible = realistic after a truthful rewrite, never inventing anything). afterRewriteExplanation explains plainly why it does or doesn't change.
- verdict with exactly 3 verdictReasons, most important first.
- gapPlan: every Missing or Partial item labelled rewrite (experience is there but poorly worded), me (candidate could confirm unlisted experience, take a short course, try the software - give the fastest honest fix, rough time, and the score it could unlock) or not_fixable.
- questions: 3 to 6 clarifying questions whose honest answers could raise the score (unlisted experience, tools, metrics, certifications) or resolve inconsistencies you found. Each answerable in a sentence.
- rewriteWorthIt: is a rewrite worth doing before applying? Say yes if the gap between now and best possible is meaningful or the verdict could improve; be honest if a key requirement can't be fixed.
- This is an informed estimate; the employer configures its own rules.`;

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        ...(resumeParts(input.resume) as Exclude<ModelMessage["content"], string>),
        { type: "text", text: `JOB DESCRIPTION:\n<job>\n${input.jobDescription}\n</job>` },
      ] as ModelMessage["content"],
    } as ModelMessage,
  ];

  return streamObject({
    request,
    schema: reportSchema,
    system,
    messages,
    maxOutputTokens: 20000,
    onDone: () => recordUsage(access.session!.supabase, "score"),
  });
}

export async function handleRewrite(request: Request) {
  const access = await gate(request, "rewrite");
  if (access.denied) return access.denied;
  const input = await parseBody(request, rewriteRequestSchema);
  if (!input) return badRequest("Something was missing from the rewrite request. Please start again.");
  const ctx = atsContext(input.atsId);
  if (!ctx) return badRequest("Please choose a hiring system.");

  const answers = input.answers
    .filter((a) => a.answer.trim())
    .map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer.trim()}`)
    .join("\n");

  const system = `${TONE}

${today()}

${ctx.text}

${ctx.strategies ? `HIRING STRATEGIES FOR THIS SYSTEM (use for nextActions):\n${ctx.strategies}` : ""}

TASK: STEP 2 - REWRITE. Edit, fix or rewrite the resume so it parses cleanly in ${ctx.ats.name}, avoids automatic rejection, scores as high as honestly possible, and impresses the recruiter who reads it next.
- Truth only: use only facts from the resume or the candidate's answers below. An answer of "no", "not really" or blank means do NOT claim it. Never invent jobs, titles, dates, degrees, skills, tools or numbers. If a metric is unknown, describe scope without making up a number.
- resumeMarkdown: the FULL revised resume, ready to paste. Format exactly:
  "# Full Name" on the first line; the next line is contact info separated by " | " (phone | email | City, ST | LinkedIn);
  "## Summary", "## Skills", "## Work Experience", "## Education", "## Certifications" (omit any section with no content - never write "none listed"; use this system's required heading names if stricter);
  each role as "### Job Title" then a line "Company | City, ST | MM/YYYY - MM/YYYY", then "- " bullets (action + task + measurable result).
  Skills as one or more "- " lines grouped by type. No tables, no columns, no emojis.
- scoreBefore must equal the Step 1 score. scoreAfter re-scores the revised resume on the same scale. cappingItem names anything still capping it.
- requirements: before/after status for each requirement from Step 1, and how it was addressed.
- changes: what you changed and why (short).
- remainingGaps: gaps a rewrite can't honestly fix, with the fastest fix from the gap plan.
- preSubmitCheck: pass/fail for single-column format, contact info in body, standard headings, consistent MM/YYYY dates, acronyms spelled out, every required qualification addressed, no invented content, file under 2MB.
- fieldsToDoubleCheck: parsed form fields to review after the ATS auto-fills (work history, education, dates...).
- fileName: FirstLast_JobTitle_Company.docx.
- nextActions: exactly 3 next actions, using this system's hiring strategies.`;

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        ...(resumeParts(input.resume) as Exclude<ModelMessage["content"], string>),
        { type: "text", text: `JOB DESCRIPTION:\n<job>\n${input.jobDescription}\n</job>` },
        {
          type: "text",
          text: `STEP 1 SCORECARD YOU ALREADY GAVE ME:\n${JSON.stringify(input.report).slice(0, 60_000)}`,
        },
        {
          type: "text",
          text: answers
            ? `MY ANSWERS TO YOUR QUESTIONS (new facts you may use):\n${answers}`
            : "I didn't add any new facts. Use only what's in my resume.",
        },
        { type: "text", text: "Continue to Step 2." },
      ] as ModelMessage["content"],
    } as ModelMessage,
  ];

  return streamObject({
    request,
    schema: rewriteSchema,
    system,
    messages,
    maxOutputTokens: 32000,
    onDone: () => recordUsage(access.session!.supabase, "rewrite"),
  });
}
