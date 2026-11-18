import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  ListChecks,
  Repeat,
  RotateCcw,
  Rocket,
  Sparkles as Spark,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { AtsSystem } from "@/data/ats";
import { BEYOND_THE_ATS, PRE_SUBMIT_CHECKLIST } from "@/data/toolkit";
import { downloadResumeDocx } from "@/lib/resume-docx";
import { parseResumeMarkdown, splitBold, stripMarkdown } from "@/lib/resume-markdown";
import type { PartialRewrite } from "@/lib/resume-schemas";
import { cn } from "@/lib/utils";

import { ScoreRing, Section, SkeletonRows, StatusPill, ThinkingNote, VerdictBadge } from "./bits";

const REWRITE_LINES = [
  "Rewriting your bullets with real results…",
  "Mirroring the job post's exact wording…",
  "Cleaning up the format so it parses perfectly…",
  "Re-scoring your new resume…",
];

type Tab = "resume" | "changes" | "requirements" | "checklist" | "next";

export function RewriteView({
  rewrite,
  loading,
  ats,
  onAnotherJob,
  onStartOver,
}: {
  rewrite: PartialRewrite | null;
  loading: boolean;
  ats: AtsSystem;
  onAnotherJob: (resumeMarkdown: string) => void;
  onStartOver: () => void;
}) {
  const w = rewrite ?? {};
  const [tab, setTab] = useState<Tab>("resume");
  const delta = (w.scoreAfter?.percent ?? 0) - (w.scoreBefore?.percent ?? 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "resume", label: "Your new resume" },
    { key: "changes", label: "What changed" },
    { key: "requirements", label: "Before & after" },
    { key: "checklist", label: "Pre-submit check" },
    { key: "next", label: "Next steps" },
  ];

  return (
    <div className="space-y-6">
      <section className="animate-rise relative overflow-hidden rounded-[2rem] border bg-card shadow-lift">
        <div className="absolute inset-0 bg-hero opacity-80" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">Rewrite complete · re-scored on {ats.name}</p>
            {w.headline ? (
              <h1 className="text-3xl leading-tight sm:text-4xl">{w.headline}</h1>
            ) : (
              <div className="h-10 w-3/4 rounded-xl shimmer-line" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <VerdictBadge verdict={w.verdict} large />
              {!loading && delta > 0 && (
                <span className="rounded-full bg-met-soft px-3 py-1 text-sm font-semibold text-met">
                  +{Math.round(delta)} points
                </span>
              )}
            </div>
            {(w.verdictReasons?.length ?? 0) > 0 && (
              <ul className="max-w-xl space-y-1.5 text-sm text-foreground/85">
                {w.verdictReasons!.map((v, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    {v}
                  </li>
                ))}
              </ul>
            )}
            {w.cappingItem && (
              <p className="max-w-xl rounded-2xl bg-card/80 px-4 py-3 text-sm">
                <span className="font-semibold text-partial">Still capping your score: </span>
                {w.cappingItem}
              </p>
            )}
            {loading && <ThinkingNote lines={REWRITE_LINES} />}
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <ScoreRing percent={w.scoreBefore?.percent} label={w.scoreBefore?.label} caption="Before" size={136} muted />
            <ArrowRight className="size-6 shrink-0 text-muted-foreground" />
            <ScoreRing percent={loading ? 0 : w.scoreAfter?.percent} label={loading ? undefined : w.scoreAfter?.label} caption="After" />
          </div>
        </div>
      </section>

      <div className="sticky top-3 z-10 -mx-1 overflow-x-auto px-1">
        <div className="inline-flex gap-1 rounded-full border bg-card/90 p-1 shadow-soft backdrop-blur">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "resume" && <ResumePaper rewrite={w} loading={loading} onAnotherJob={onAnotherJob} />}

      {tab === "changes" && (
        <Section title="What we changed and why" icon={Spark}>
          {(w.changes?.length ?? 0) === 0 ? (
            <SkeletonRows />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {w.changes!.map((c, i) => (
                <li key={i} className="rounded-2xl bg-muted/60 p-4 text-sm">
                  <p className="font-semibold">{c.change}</p>
                  {c.why && <p className="mt-1 text-muted-foreground">{c.why}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "requirements" && (
        <Section title="Requirement map: before and after" icon={Target}>
          {(w.requirements?.length ?? 0) === 0 ? (
            <SkeletonRows rows={4} />
          ) : (
            <ul className="divide-y">
              {w.requirements!.map((q, i) => (
                <li key={i} className="grid gap-2 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                  <div>
                    <p className="font-semibold">{q.requirement}</p>
                    {q.how && <p className="mt-0.5 text-sm text-muted-foreground">{q.how}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={q.before} className="opacity-70" />
                    <ArrowRight className="size-4 text-muted-foreground" />
                    <StatusPill status={q.after} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {tab === "checklist" && <Checklist rewrite={w} loading={loading} />}

      {tab === "next" && <NextSteps rewrite={w} loading={loading} ats={ats} />}

      <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
        {!loading && w.resumeMarkdown && (
          <Button variant="soft" size="lg" onClick={() => onAnotherJob(w.resumeMarkdown!)}>
            <Repeat /> Use this resume for another job
          </Button>
        )}
        <Button variant="ghost" size="lg" onClick={onStartOver}>
          <RotateCcw /> Start over
        </Button>
      </div>
    </div>
  );
}

function ResumePaper({
  rewrite,
  loading,
  onAnotherJob,
}: {
  rewrite: PartialRewrite;
  loading: boolean;
  onAnotherJob: (md: string) => void;
}) {
  const md = rewrite.resumeMarkdown ?? "";
  const blocks = useMemo(() => parseResumeMarkdown(md), [md]);
  const [copied, setCopied] = useState(false);
  const fileName = rewrite.fileName || "Resume.docx";

  const copy = async () => {
    await navigator.clipboard.writeText(stripMarkdown(md));
    setCopied(true);
    toast.success("Resume copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <article className="animate-rise min-h-96 rounded-3xl border bg-card px-6 py-8 shadow-lift sm:px-12 sm:py-12">
        {blocks.length === 0 ? (
          <SkeletonRows rows={6} />
        ) : (
          <div className="mx-auto max-w-2xl text-[15px] leading-relaxed">
            {blocks.map((b, i) => {
              const text = splitBold(b.text).map((p, j) =>
                p.bold ? <strong key={j}>{p.text}</strong> : <span key={j}>{p.text}</span>,
              );
              switch (b.type) {
                case "name":
                  return <h2 key={i} className="text-center text-3xl font-medium">{text}</h2>;
                case "contact":
                  return <p key={i} className="mt-1 mb-4 text-center text-sm text-muted-foreground">{text}</p>;
                case "heading":
                  return (
                    <h3 key={i} className="mt-6 mb-2 border-b pb-1 font-sans text-xs font-bold tracking-[0.14em] text-primary uppercase">
                      {text}
                    </h3>
                  );
                case "role":
                  return <p key={i} className="mt-3 font-semibold">{text}</p>;
                case "bullet":
                  return (
                    <p key={i} className="relative mt-1 pl-4 before:absolute before:top-[0.65em] before:left-0 before:size-1.5 before:rounded-full before:bg-primary/50">
                      {text}
                    </p>
                  );
                default:
                  return <p key={i} className="mt-1 text-foreground/80">{text}</p>;
              }
            })}
            {loading && <div className="mt-3 h-5 w-2/3 rounded-lg shimmer-line" />}
          </div>
        )}
      </article>
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-3xl border bg-card p-5 shadow-soft">
          <p className="flex items-start gap-2 text-sm font-semibold break-all">
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" /> {loading ? "Writing…" : fileName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Single column, standard headings, ready for the hiring system.</p>
          <div className="mt-4 grid gap-2">
            <Button
              variant="hero"
              disabled={loading || !md}
              onClick={() => downloadResumeDocx(md, fileName).catch(() => toast.error("Download failed. Try copying instead."))}
            >
              <Download /> Download Word file
            </Button>
            <Button variant="outline" disabled={loading || !md} onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy text"}
            </Button>
            <Button variant="ghost" disabled={loading || !md} onClick={() => onAnotherJob(md)}>
              <Repeat /> Score it for another job
            </Button>
          </div>
        </div>
        <p className="px-2 text-xs leading-relaxed text-muted-foreground">
          Read it through before you send it. Every fact should be true and match your LinkedIn.
        </p>
      </aside>
    </div>
  );
}

function Checklist({ rewrite, loading }: { rewrite: PartialRewrite; loading: boolean }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const pct = Math.round((done.size / PRE_SUBMIT_CHECKLIST.length) * 100);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Automatic check" subtitle="How your new resume does on the format rules" icon={ListChecks}>
        {(rewrite.preSubmitCheck?.length ?? 0) === 0 ? (
          <SkeletonRows rows={4} />
        ) : (
          <ul className="space-y-2.5">
            {rewrite.preSubmitCheck!.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-2xl border p-3.5 text-sm">
                <div>
                  <p className="font-semibold">{c.check}</p>
                  {c.note && <p className="mt-0.5 text-muted-foreground">{c.note}</p>}
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        )}
        {loading && <p className="mt-3 text-xs text-muted-foreground">Still checking…</p>}
      </Section>
      <Section title="Before you click Submit" subtitle="Tick each one off as you go" icon={Check}>
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{pct}% complete</span>
            <span className={pct === 100 ? "text-met" : "text-muted-foreground"}>
              {pct === 100 ? "Ready to submit!" : "Not yet"}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        <ul className="space-y-1">
          {PRE_SUBMIT_CHECKLIST.map((item, i) => (
            <li key={i}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2.5 hover:bg-muted/70">
                <Checkbox
                  checked={done.has(i)}
                  onCheckedChange={(v) =>
                    setDone((prev) => {
                      const next = new Set(prev);
                      if (v) next.add(i);
                      else next.delete(i);
                      return next;
                    })
                  }
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className={cn("font-medium", done.has(i) && "text-muted-foreground line-through")}>{item.check}</span>
                  <span className="block text-xs text-muted-foreground">{item.why}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function NextSteps({ rewrite, loading, ats }: { rewrite: PartialRewrite; loading: boolean; ats: AtsSystem }) {
  const tips = BEYOND_THE_ATS.filter(
    (t) => /all/i.test(t.where) || t.where.toLowerCase().includes((ats.name.split(" ")[0] ?? ats.name).toLowerCase()),
  ).slice(0, 6);
  return (
    <div className="space-y-6">
      <Section title="Your 3 next moves" icon={Rocket}>
        {(rewrite.nextActions?.length ?? 0) === 0 ? (
          <SkeletonRows />
        ) : (
          <ol className="grid gap-3 sm:grid-cols-3">
            {rewrite.nextActions!.map((a, i) => (
              <li key={i} className="rounded-2xl bg-primary-soft p-4 text-sm leading-relaxed">
                <span className="font-display mb-1 block text-2xl text-primary">{i + 1}</span>
                {a}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Still missing" subtitle="Gaps a rewrite can't honestly fix" icon={Target}>
          {loading && !rewrite.remainingGaps?.length ? (
            <SkeletonRows rows={2} />
          ) : rewrite.remainingGaps?.length ? (
            <ul className="space-y-2.5">
              {rewrite.remainingGaps.map((g, i) => (
                <li key={i} className="rounded-2xl bg-partial-soft/70 p-3.5 text-sm">
                  <p className="font-semibold">{g.gap}</p>
                  {g.fastestFix && <p className="mt-0.5 text-foreground/75">Fastest fix: {g.fastestFix}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl bg-met-soft p-4 text-sm text-met">No gaps left. You're covering everything.</p>
          )}
        </Section>
        <Section title={`After you upload to ${ats.name}`} subtitle="Double-check these auto-filled fields" icon={ListChecks}>
          {(rewrite.fieldsToDoubleCheck?.length ?? 0) === 0 ? (
            <SkeletonRows rows={2} />
          ) : (
            <ul className="space-y-2">
              {rewrite.fieldsToDoubleCheck!.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
      <Section title="Beyond the hiring system" subtitle="What else gets people hired" icon={Spark}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((t) => (
            <li key={t.strategy} className="rounded-2xl bg-muted/60 p-4 text-sm">
              <p className="font-semibold">{t.strategy}</p>
              <p className="mt-1 text-foreground/80">{t.what}</p>
              <p className="mt-2 text-xs text-muted-foreground">{t.how}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
