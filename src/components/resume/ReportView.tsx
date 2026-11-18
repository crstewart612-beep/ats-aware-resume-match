import {
  ArrowRight,
  ClipboardCheck,
  Compass,
  Lightbulb,
  ListChecks,
  MessageCircleQuestion,
  RotateCcw,
  ShieldAlert,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AtsSystem } from "@/data/ats";
import type { PartialReport, ReqStatus } from "@/lib/resume-schemas";
import { cn } from "@/lib/utils";

import { ScoreRing, Section, SkeletonRows, StatusPill, ThinkingNote, VerdictBadge, verdictNote } from "./bits";

export type Answer = { question: string; choice: "yes" | "no" | "unsure" | null; details: string };

export function ReportView({
  report,
  loading,
  ats,
  onRewrite,
  onStartOver,
}: {
  report: PartialReport | null;
  loading: boolean;
  ats: AtsSystem;
  onRewrite: (answers: { question: string; answer: string }[]) => void;
  onStartOver: () => void;
}) {
  const r = report ?? {};
  return (
    <div className="space-y-6">
      {/* Scorecard header */}
      <section className="animate-rise relative overflow-hidden rounded-[2rem] border bg-card shadow-lift">
        <div className="absolute inset-0 bg-hero opacity-80" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">
              {ats.name} scorecard · {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {r.jobTitle ? (
              <h1 className="text-3xl leading-tight sm:text-4xl">
                {r.jobTitle}
                {r.company && <span className="text-muted-foreground"> at {r.company}</span>}
              </h1>
            ) : (
              <div className="h-10 w-3/4 rounded-xl shimmer-line" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <VerdictBadge verdict={r.verdict} large />
              {verdictNote(r.verdict) && <span className="text-sm text-muted-foreground">{verdictNote(r.verdict)}</span>}
            </div>
            {r.summary ? (
              <p className="max-w-xl text-base leading-relaxed text-foreground/85">{r.summary}</p>
            ) : (
              <SkeletonRows rows={1} />
            )}
            {r.cappingItem && (
              <p className="max-w-xl rounded-2xl bg-card/80 px-4 py-3 text-sm">
                <span className="font-semibold text-missing">What's holding your score back: </span>
                {r.cappingItem}
              </p>
            )}
            {loading && <ThinkingNote />}
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <ScoreRing percent={r.scoreNow?.percent} label={r.scoreNow?.label} caption="Your score now" />
            <ArrowRight className="size-6 shrink-0 text-muted-foreground" />
            <ScoreRing
              percent={r.bestPossible?.percent}
              label={r.bestPossible?.label}
              caption="Best possible"
              size={136}
              muted
            />
          </div>
        </div>
        {r.afterRewriteExplanation && (
          <p className="relative border-t bg-card/70 px-6 py-4 text-sm text-muted-foreground sm:px-9">
            <span className="font-semibold text-foreground">About the best possible score: </span>
            {r.afterRewriteExplanation}
          </p>
        )}
      </section>

      {(r.verdictReasons?.length ?? 0) > 0 && (
        <Section title="Why this verdict" icon={Compass}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {r.verdictReasons!.map((reason, i) => (
              <li key={i} className="rounded-2xl bg-muted/70 p-4 text-sm leading-relaxed">
                <span className="font-display mb-1 block text-2xl text-primary">{i + 1}</span>
                {reason}
              </li>
            ))}
          </ol>
        </Section>
      )}

      <RequirementMap report={r} loading={loading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`How ${ats.name} will read your file`} icon={ClipboardCheck}>
          {(r.atsChecks?.length ?? 0) === 0 ? (
            <SkeletonRows />
          ) : (
            <ul className="space-y-2.5">
              {r.atsChecks!.map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-3 rounded-2xl border p-3.5">
                  <div className="text-sm">
                    <p className="font-semibold">{c.check}</p>
                    {c.note && <p className="mt-0.5 text-muted-foreground">{c.note}</p>}
                  </div>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section
          title="Knockout question risks"
          icon={ShieldAlert}
          subtitle="Questions where a wrong answer can mean automatic rejection"
        >
          {loading && !r.knockoutRisks?.length ? (
            <SkeletonRows rows={2} />
          ) : r.knockoutRisks?.length ? (
            <ul className="space-y-2.5">
              {r.knockoutRisks.map((k, i) => (
                <li key={i} className="rounded-2xl bg-missing-soft/70 p-3.5 text-sm">
                  <p className="font-semibold">{k.risk}</p>
                  {k.note && <p className="mt-0.5 text-foreground/75">{k.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-met-soft p-4 text-sm text-met">No obvious knockout risks. Nice.</p>
          )}
        </Section>
      </div>

      <GapPlan report={r} loading={loading} />

      {!loading && report && (
        <QuestionsPanel report={report} onRewrite={onRewrite} onStartOver={onStartOver} />
      )}

      <p className="px-2 text-center text-xs text-muted-foreground">
        Scores are informed estimates. Each employer configures its own hiring system, and no tool can see the
        employer's real score or guarantee an interview.
      </p>
    </div>
  );
}

function RequirementMap({ report, loading }: { report: PartialReport; loading: boolean }) {
  const [filter, setFilter] = useState<ReqStatus | "all">("all");
  const reqs = report.requirements ?? [];
  const counts = useMemo(
    () => ({
      met: reqs.filter((q) => q.status === "met").length,
      partial: reqs.filter((q) => q.status === "partial").length,
      missing: reqs.filter((q) => q.status === "missing").length,
    }),
    [reqs],
  );
  const shown = filter === "all" ? reqs : reqs.filter((q) => q.status === filter);
  const chips: { key: ReqStatus | "all"; label: string; n: number }[] = [
    { key: "all", label: "All", n: reqs.length },
    { key: "met", label: "Met", n: counts.met },
    { key: "partial", label: "Partial", n: counts.partial },
    { key: "missing", label: "Missing", n: counts.missing },
  ];
  return (
    <Section
      title="Where you match, and where you don't"
      subtitle="Every requirement from the job post, checked against your resume"
      icon={ListChecks}
      action={
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilter(c.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                filter === c.key ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {c.label} · {c.n}
            </button>
          ))}
        </div>
      }
    >
      {reqs.length === 0 ? (
        <SkeletonRows rows={4} />
      ) : (
        <ul className="divide-y">
          {shown.map((q, i) => (
            <li key={i} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{q.requirement}</p>
                  {q.type && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                        q.type === "required" ? "bg-secondary text-secondary-foreground" : "bg-sky-soft text-sky",
                      )}
                      title={q.classification}
                    >
                      {q.type}
                    </span>
                  )}
                </div>
                {q.evidence ? (
                  <p className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground italic">“{q.evidence}”</p>
                ) : q.status && q.status !== "met" ? (
                  <p className="text-sm text-muted-foreground">Not found in your resume.</p>
                ) : null}
              </div>
              <StatusPill status={q.status} />
            </li>
          ))}
          {loading && <li className="py-3"><div className="h-10 rounded-xl shimmer-line" /></li>}
        </ul>
      )}
    </Section>
  );
}

const gapGroups = [
  { key: "rewrite", title: "Fixable by a rewrite", note: "The experience is there. It just needs clearer wording.", tone: "bg-met-soft text-met" },
  { key: "me", title: "Fixable by you", note: "Something you could confirm, learn or try.", tone: "bg-partial-soft text-partial" },
  { key: "not_fixable", title: "Not fixable for this job", note: "Be honest with yourself here.", tone: "bg-missing-soft text-missing" },
] as const;

function GapPlan({ report, loading }: { report: PartialReport; loading: boolean }) {
  const gaps = report.gapPlan ?? [];
  if (!loading && gaps.length === 0) return null;
  return (
    <Section title="Your gap plan" subtitle="Every partial or missing item, and the fastest honest fix" icon={Lightbulb}>
      {gaps.length === 0 ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {gapGroups.map((g) => {
            const items = gaps.filter((x) => x.category === g.key);
            return (
              <div key={g.key} className="rounded-2xl bg-muted/60 p-4">
                <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold", g.tone)}>
                  {g.title} · {items.length}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">{g.note}</p>
                <ul className="mt-3 space-y-2.5">
                  {items.map((x, i) => (
                    <li key={i} className="rounded-xl bg-card p-3.5 text-sm shadow-soft">
                      <p className="font-semibold">{x.item}</p>
                      {x.fix && <p className="mt-1 leading-relaxed text-foreground/80">{x.fix}</p>}
                      {(x.timeNeeded || x.unlocks) && (
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {x.timeNeeded && <span>⏱ {x.timeNeeded}</span>}
                          {x.unlocks && <span>↑ {x.unlocks}</span>}
                        </p>
                      )}
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-sm text-muted-foreground">Nothing here.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

const choiceLabels = { yes: "Yes", no: "No", unsure: "Not sure" } as const;

function QuestionsPanel({
  report,
  onRewrite,
  onStartOver,
}: {
  report: PartialReport;
  onRewrite: (answers: { question: string; answer: string }[]) => void;
  onStartOver: () => void;
}) {
  const questions = (report.questions ?? []).filter((q) => q.question);
  const [answers, setAnswers] = useState<Answer[]>(
    questions.map((q) => ({ question: q.question!, choice: null, details: "" })),
  );
  const answered = answers.filter((a) => a.choice || a.details.trim()).length;
  const worth = report.rewriteWorthIt;

  const update = (i: number, patch: Partial<Answer>) =>
    setAnswers((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const submit = () =>
    onRewrite(
      answers
        .filter((a) => a.choice || a.details.trim())
        .map((a) => ({
          question: a.question,
          answer: [a.choice ? choiceLabels[a.choice] : "", a.details.trim()].filter(Boolean).join(": "),
        })),
    );

  return (
    <section className="animate-rise overflow-hidden rounded-[2rem] border bg-card shadow-lift">
      <div className="bg-secondary/70 px-6 py-6 sm:px-9">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-card text-secondary-foreground shadow-soft">
            <MessageCircleQuestion className="size-5" />
          </span>
          <div>
            <h2 className="text-2xl">Is a rewrite worth it? Let's find out.</h2>
            <p className="mt-1 text-sm text-secondary-foreground/80">
              Answer what you can. Honest answers only. Anything you confirm can be added to your resume; anything you
              say no to stays off.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6 sm:p-9">
        {questions.map((q, i) => {
          const a = answers[i];
          return (
            <div key={i} className="rounded-2xl border p-4 sm:p-5">
              <p className="font-semibold">
                <span className="mr-2 text-primary">{i + 1}.</span>
                {q.question}
              </p>
              {q.why && <p className="mt-1 text-sm text-muted-foreground">{q.why}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(choiceLabels) as (keyof typeof choiceLabels)[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => update(i, { choice: a?.choice === c ? null : c })}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-semibold transition-all",
                      a?.choice === c
                        ? c === "yes"
                          ? "border-met bg-met-soft text-met"
                          : c === "no"
                            ? "border-missing bg-missing-soft text-missing"
                            : "border-partial bg-partial-soft text-partial"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    {choiceLabels[c]}
                  </button>
                ))}
              </div>
              {(a?.choice === "yes" || a?.choice === "unsure" || a?.details) && (
                <Textarea
                  value={a?.details ?? ""}
                  onChange={(e) => update(i, { details: e.target.value })}
                  placeholder="Add the details: where, when, what tool, any numbers…"
                  className="animate-rise mt-3 min-h-20 rounded-xl"
                />
              )}
            </div>
          );
        })}

        {worth && (
          <div
            className={cn(
              "rounded-2xl p-5",
              worth.worth ? "bg-met-soft" : "bg-partial-soft",
            )}
          >
            <p className={cn("font-display text-lg", worth.worth ? "text-met" : "text-partial")}>
              {worth.worth ? "Our take: yes, a rewrite is worth it." : "Our take: a rewrite may not change much."}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">{worth.reason}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onStartOver}>
            <RotateCcw /> Try a different job
          </Button>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button variant="hero" size="xl" onClick={submit}>
              <Wand2 /> Rewrite my resume
            </Button>
            <span className="text-center text-xs text-muted-foreground sm:text-right">
              {answered} of {questions.length} answered · takes about a minute
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
