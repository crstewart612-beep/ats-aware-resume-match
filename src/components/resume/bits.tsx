import { CheckCircle2, CircleAlert, CircleX, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/resume-schemas";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid size-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M7 4h7l4 4v12H7z" />
          <path d="M10 13l2 2 4-4" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight">Resume Match</span>
    </span>
  );
}

export type Tone = "met" | "partial" | "missing" | "sky";

export const toneFor = (pct: number): Tone => (pct >= 72 ? "met" : pct >= 48 ? "partial" : "missing");

const toneText: Record<Tone, string> = {
  met: "text-met",
  partial: "text-partial",
  missing: "text-missing",
  sky: "text-sky",
};
const toneBg: Record<Tone, string> = {
  met: "bg-met-soft text-met",
  partial: "bg-partial-soft text-partial",
  missing: "bg-missing-soft text-missing",
  sky: "bg-sky-soft text-sky",
};
export const toneClasses = { text: toneText, bg: toneBg };

export function ScoreRing({
  percent,
  label,
  caption,
  size = 176,
  muted = false,
}: {
  percent: number | undefined;
  label: string | undefined;
  caption: string;
  size?: number;
  muted?: boolean;
}) {
  const [shown, setShown] = useState(0);
  const pct = Math.max(0, Math.min(100, percent ?? 0));
  useEffect(() => {
    const t = setTimeout(() => setShown(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = muted ? "sky" : toneFor(pct);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (shown / 100) * c}
            className={cn("transition-[stroke-dashoffset] duration-[1400ms] ease-out", toneText[tone])}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          {percent !== undefined ? (
            <div className="flex flex-col items-center px-4">
              <span className="font-display text-5xl leading-tight font-semibold">{pct}%</span>
            </div>
          ) : (
            <span className="h-8 w-16 rounded-full shimmer-line" />
          )}
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{caption}</span>
    </div>
  );
}

type StatusKey = "met" | "partial" | "missing" | "pass" | "risk" | "fail";
const statusMeta: Record<StatusKey, { label: string; tone: Tone; icon: LucideIcon }> = {
  met: { label: "Met", tone: "met", icon: CheckCircle2 },
  pass: { label: "Pass", tone: "met", icon: CheckCircle2 },
  partial: { label: "Partial", tone: "partial", icon: CircleAlert },
  risk: { label: "Risk", tone: "partial", icon: CircleAlert },
  missing: { label: "Missing", tone: "missing", icon: CircleX },
  fail: { label: "Fail", tone: "missing", icon: CircleX },
};

export function StatusPill({ status, className }: { status?: StatusKey | undefined; className?: string }) {
  if (!status || !statusMeta[status]) return <span className="h-6 w-16 rounded-full shimmer-line" />;
  const m = statusMeta[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        toneBg[m.tone],
        className,
      )}
    >
      <Icon className="size-3.5" />
      {m.label}
    </span>
  );
}

const verdictMeta: Record<Verdict, { label: string; tone: Tone; note: string }> = {
  apply: { label: "Apply", tone: "met", note: "You're a solid match." },
  apply_with_referral: {
    label: "Apply with a referral",
    tone: "sky",
    note: "Worth applying. A referral will help you get seen.",
  },
  skip: { label: "Consider skipping", tone: "missing", note: "A key requirement is out of reach for now." },
};

export function VerdictBadge({ verdict, large }: { verdict?: Verdict | undefined; large?: boolean }) {
  if (!verdict || !verdictMeta[verdict]) return <span className="h-8 w-40 rounded-full shimmer-line" />;
  const m = verdictMeta[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-semibold",
        toneBg[m.tone],
        large ? "px-4 py-2 text-base" : "px-3 py-1 text-sm",
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
export const verdictNote = (v?: Verdict) => (v ? verdictMeta[v]?.note : undefined);

export function Section({
  title,
  icon: Icon,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("animate-rise rounded-3xl border bg-card p-5 shadow-soft sm:p-7", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="size-4.5" />
            </span>
          )}
          <div>
            <h2 className="text-xl font-medium">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const DEFAULT_LINES = [
  "Reading your resume…",
  "Matching every requirement in the job post…",
  "Checking how the hiring system will read your file…",
  "Looking for knockout question risks…",
  "Working out your honest best-possible score…",
];

export function ThinkingNote({ lines = DEFAULT_LINES }: { lines?: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 3200);
    return () => clearInterval(t);
  }, [lines.length]);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
      </span>
      <span key={i} className="animate-rise">
        {lines[i]}
      </span>
    </div>
  );
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl shimmer-line" />
      ))}
    </div>
  );
}
