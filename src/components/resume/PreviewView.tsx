import { ArrowRight, Check, KeyRound, Lock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AtsSystem } from "@/data/ats";
import { useAccess } from "@/lib/access-context";
import { PACK_REPORTS } from "@/lib/entitlements";
import { quickScore, resumeText, type QuickScore } from "@/lib/quick-score";
import type { ResumeInput } from "@/lib/resume-schemas";
import { usePackPurchase } from "@/lib/use-pack-purchase";

import { ScoreRing, SkeletonRows } from "./bits";

/** Free first look (worked out without AI) with the full report locked until the customer pays. */
export function PreviewView({
  ats,
  jobDescription,
  resume,
  onUnlocked,
}: {
  ats: AtsSystem;
  jobDescription: string;
  resume: ResumeInput;
  onUnlocked: () => void;
}) {
  const [score, setScore] = useState<QuickScore | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    resumeText(resume)
      .then((t) => live && setScore(quickScore(jobDescription, t)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [resume, jobDescription]);

  return (
    <div className="space-y-6">
      <section className="animate-rise relative overflow-hidden rounded-[2rem] border bg-card shadow-lift">
        <div className="absolute inset-0 bg-hero opacity-80" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">Your before score · {ats.name}</p>
            <h1 className="text-3xl leading-tight sm:text-4xl">
              {score
                ? `Your resume matches ${score.matched.length} of the job's ${score.matched.length + score.missing.length} key terms.`
                : failed
                  ? "Here's your first look."
                  : "Reading your resume..."}
            </h1>
            {score ? (
              <>
                {score.matched.length > 0 && (
                  <TermList title="Found in your resume" terms={score.matched} tone="met" />
                )}
                {score.missing.length > 0 && (
                  <TermList title="Missing from your resume" terms={score.missing} tone="missing" />
                )}
              </>
            ) : failed ? (
              <p className="text-sm text-muted-foreground">
                We couldn't read the words in this file for the quick score. Your full report reads it fine.
              </p>
            ) : (
              <SkeletonRows rows={2} />
            )}
          </div>
          <div className="flex justify-center">
            <ScoreRing percent={score?.percent} label={score ? `${score.percent}%` : undefined} caption="Before" />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border bg-card shadow-soft">
        <div aria-hidden className="pointer-events-none space-y-4 p-6 opacity-60 blur-[6px] select-none sm:p-9">
          {["Why this verdict", "Requirement by requirement", `How ${ats.name} will read your file`, "Your rewrite and new score"].map(
            (t) => (
              <div key={t} className="rounded-2xl border p-5">
                <p className="font-display text-xl">{t}</p>
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-11/12 rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ),
          )}
        </div>
        <div className="absolute inset-0 grid place-items-center bg-background/40 p-4">
          <UnlockCard ats={ats} onUnlocked={onUnlocked} />
        </div>
      </section>
    </div>
  );
}

function TermList({ title, terms, tone }: { title: string; terms: string[]; tone: "met" | "missing" }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <li
            key={t}
            className={
              tone === "met"
                ? "rounded-full bg-met-soft px-3 py-1 text-xs font-semibold text-met"
                : "rounded-full bg-missing-soft px-3 py-1 text-xs font-semibold text-missing"
            }
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnlockCard({ ats, onUnlocked }: { ats: AtsSystem; onUnlocked: () => void }) {
  const { useCode } = useAccess();
  const { buy, busy, waiting } = usePackPurchase(() => onUnlocked(), "/");
  const [entry, setEntry] = useState("");

  const enter = async () => {
    const ok = await useCode(entry).catch(() => null);
    if (ok === null) return toast.error("We couldn't reach the server. Check your connection and try again.");
    if (!ok) return toast.error("That code wasn't found. Check the letters and try again.");
    setEntry("");
    toast.success("Code added. Opening your full report.");
    onUnlocked();
  };

  return (
    <div className="w-full max-w-md rounded-[1.75rem] border bg-card p-6 text-center shadow-lift sm:p-8">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
        <Lock className="size-5" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold">Unlock your full {ats.name} report</h2>
      {waiting ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Payment received. Creating your access code, this can take a minute. Please keep this page open.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2 text-left text-sm">
            {[
              "Your real score on this hiring system's own scale",
              "Every requirement checked, plus what to fix",
              "A truthful rewrite with your new score and a Word download",
              `${PACK_REPORTS} reports for any jobs you apply to, they never expire`,
            ].map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {b}
              </li>
            ))}
          </ul>
          <Button size="xl" className="mt-6 w-full" onClick={buy} disabled={busy}>
            <Sparkles /> {busy ? "Opening checkout..." : `Get ${PACK_REPORTS} reports for $19`} <ArrowRight />
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">One payment. No account. Nothing renews.</p>
          <form
            className="mt-5 flex gap-2 border-t pt-5"
            onSubmit={(e) => {
              e.preventDefault();
              void enter();
            }}
          >
            <KeyRound className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
            <Input
              aria-label="Access code"
              placeholder="Have a code?"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="font-mono uppercase"
            />
            <Button type="submit" variant="outline" disabled={entry.trim().length < 12}>
              Use code
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
