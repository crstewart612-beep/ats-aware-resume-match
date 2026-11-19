import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase, FileUp, Gauge, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AtsPicker } from "@/components/resume/AtsPicker";
import { PreviewView } from "@/components/resume/PreviewView";
import { Logo } from "@/components/resume/bits";
import { ReportView } from "@/components/resume/ReportView";
import { ResumeDrop } from "@/components/resume/ResumeDrop";
import { RewriteView } from "@/components/resume/RewriteView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALL_ATS, findAts } from "@/data/ats";
import { stripMarkdown } from "@/lib/resume-markdown";
import type { PartialReport, PartialRewrite, Report, ResumeInput, Rewrite } from "@/lib/resume-schemas";
import { StreamRequestError, postNdjson } from "@/lib/stream-client";
import { useAccess } from "@/lib/access-context";
import { PENDING_KEY } from "@/lib/use-pack-purchase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeMatch: Know your ATS score before you apply" },
      {
        name: "description",
        content:
          "Choose the employer's hiring system, paste the job description and attach your resume. Get an honest score, a gap report and a rewrite.",
      },
      { property: "og:title", content: "ResumeMatch: Know your ATS score before you apply" },
      {
        property: "og:description",
        content: "An honest resume score for Workday, Greenhouse, Taleo, iCIMS and 13 more hiring systems.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Stage = "setup" | "preview" | "report" | "rewrite";

// Kept in memory only (never saved), so a customer sent to the pay page finds their entries
// still filled in when they come back to start their report.
const draft: { atsId: string | null; jobDescription: string; resume: ResumeInput | null } = {
  atsId: null,
  jobDescription: "",
  resume: null,
};
const MIN_JD = 80;
const DRAFT_KEY = "rm_draft";
const AUTORUN_KEY = "rm_autorun";

function Index() {
  const { allowance, refresh, status } = useAccess();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("setup");
  const [atsId, setAtsId] = useState<string | null>(draft.atsId);
  const [jobDescription, setJobDescription] = useState(draft.jobDescription);
  const [resume, setResume] = useState<ResumeInput | null>(draft.resume);
  const [restored, setRestored] = useState(false);
  // Restore entries after the pay page (payment reloads the page, so memory alone is not enough).
  // Kept only in this browser tab's session storage, which the browser clears when the tab closes.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw && !draft.jobDescription && !draft.resume) {
        const d = JSON.parse(raw);
        setAtsId(d.atsId ?? null);
        setJobDescription(d.jobDescription ?? "");
        setResume(d.resume ?? null);
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    Object.assign(draft, { atsId, jobDescription, resume });
    if (!restored) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ atsId, jobDescription, resume }));
    } catch {
      /* too large or blocked; memory copy still works */
    }
  }, [atsId, jobDescription, resume, restored]);
  const [report, setReport] = useState<PartialReport | null>(null);
  const [finalReport, setFinalReport] = useState<Report | null>(null);
  const [rewrite, setRewrite] = useState<PartialRewrite | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const jdRef = useRef<HTMLDivElement>(null);

  const ats = atsId ? findAts(atsId) : null;
  const ready = !!ats && jobDescription.trim().length >= MIN_JD && !!resume;

  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const fail = (e: unknown, back: Stage) => {
    if (e instanceof DOMException && e.name === "AbortError") {
      toast("Stopped.");
    } else if (e instanceof StreamRequestError && (e.code === "plan_required" || e.code === "bad_code")) {
      if (back === "setup") {
        toast.error(e.message);
        // Show the free before score with the pay box instead of a separate page.
        try { sessionStorage.setItem(AUTORUN_KEY, "1"); } catch { /* ignore */ }
        setStage("preview");
        return;
      }
      // Out of rewrites: keep the scorecard on screen and let them choose to buy more.
      toast(e.message, { action: { label: "Get reports", onClick: () => void navigate({ to: "/account" }) } });
    } else {
      const message = e instanceof StreamRequestError ? e.message : "Something went wrong. Please try again.";
      toast.error(message);
    }
    setStage(back);
  };

  const analyze = async () => {
    if (!ready || !ats || !resume) return;
    if (!status || status.scoresLeft <= 0) {
      // Unpaid: show the free before score (no AI used) with the rest locked until they pay.
      // Flag it so the full report opens by itself as soon as a code is active.
      try { sessionStorage.setItem(AUTORUN_KEY, "1"); } catch { /* ignore */ }
      setStage("preview");
      top();
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setReport(null);
    setFinalReport(null);
    setRewrite(null);
    setStage("report");
    setLoading(true);
    top();
    try {
      const final = await postNdjson<Report>(
        "/api/analyze",
        { atsId: ats.id, jobDescription, resume },
        (p) => setReport(p as PartialReport),
        ctrl.signal,
      );
      setReport(final);
      setFinalReport(final);
    } catch (e) {
      fail(e, "setup");
    } finally {
      setLoading(false);
      refresh().catch(() => {});
    }
  };

  // Checkout reloaded the page while the code is still being created: stay on the preview.
  useEffect(() => {
    if (!restored || !ready) return;
    try {
      if (localStorage.getItem(PENDING_KEY)) {
        sessionStorage.setItem(AUTORUN_KEY, "1");
        setStage("preview");
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  // Came back from the pay page with a working code: go straight to the report.
  useEffect(() => {
    if (!restored || loading || (stage !== "setup" && stage !== "preview") || !ready || !status || status.scoresLeft <= 0) return;
    let flag: string | null = null;
    try { flag = sessionStorage.getItem(AUTORUN_KEY); } catch { /* ignore */ }
    if (!flag) return;
    try { sessionStorage.removeItem(AUTORUN_KEY); } catch { /* ignore */ }
    void analyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, ready, status, stage, loading]);

  const runRewrite = async (answers: { question: string; answer: string }[]) => {
    if (!ats || !resume || !finalReport) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRewrite(null);
    setStage("rewrite");
    setLoading(true);
    top();
    try {
      const final = await postNdjson<Rewrite>(
        "/api/rewrite",
        { atsId: ats.id, jobDescription, resume, report: finalReport, answers },
        (p) => setRewrite(p as PartialRewrite),
        ctrl.signal,
      );
      setRewrite(final);
    } catch (e) {
      fail(e, "report");
    } finally {
      setLoading(false);
      refresh().catch(() => {});
    }
  };

  const startOver = () => {
    abortRef.current?.abort();
    setStage("setup");
    setReport(null);
    setRewrite(null);
    setFinalReport(null);
    top();
  };

  const anotherJob = (md: string) => {
    setResume({ kind: "text", name: "Your rewritten resume", text: stripMarkdown(md) });
    setJobDescription("");
    setReport(null);
    setRewrite(null);
    setFinalReport(null);
    setStage("setup");
    toast.success("Your new resume is loaded. Paste the next job description.");
    setTimeout(() => jdRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <button type="button" onClick={startOver} aria-label="Resume Match home">
          <Logo />
        </button>
        <div className="flex items-center gap-2">
          <Link to="/account">
            <Button variant="outline" size="sm">
              Get reports
            </Button>
          </Link>
          {loading && (
            <Button variant="outline" size="sm" onClick={() => abortRef.current?.abort()}>
              <Square className="size-3" /> Stop
            </Button>
          )}
          {stage !== "setup" && !loading && (
            <Button variant="ghost" size="sm" onClick={() => setStage(stage === "rewrite" ? "report" : "setup")}>
              <ArrowLeft /> {stage === "rewrite" ? "Back to scorecard" : "Edit details"}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {stage === "setup" && (
          <Setup
            atsId={atsId}
            setAtsId={setAtsId}
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            resume={resume}
            setResume={setResume}
            ready={ready}
            onAnalyze={analyze}
            jdRef={jdRef}
            allowance={allowance}
          />
        )}
        {stage === "preview" && ats && resume && (
          <PreviewView
            ats={ats}
            jobDescription={jobDescription}
            resume={resume}
            onUnlocked={() => {
              // The code is active; the report starts by itself once the new allowance loads.
              try { sessionStorage.setItem(AUTORUN_KEY, "1"); } catch { /* ignore */ }
            }}
          />
        )}
        {stage === "report" && ats && (
          <ReportView
            key={finalReport ? "final" : "live"}
            report={report}
            loading={loading}
            ats={ats}
            onRewrite={runRewrite}
            onStartOver={startOver}
          />
        )}
        {stage === "rewrite" && ats && (
          <RewriteView rewrite={rewrite} loading={loading} ats={ats} onAnotherJob={anotherJob} onStartOver={startOver} />
        )}
      </main>
    </div>
  );
}

function Setup(props: {
  atsId: string | null;
  setAtsId: (id: string | null) => void;
  jobDescription: string;
  setJobDescription: (v: string) => void;
  resume: ResumeInput | null;
  setResume: (r: ResumeInput | null) => void;
  ready: boolean;
  onAnalyze: () => void;
  jdRef: React.RefObject<HTMLDivElement | null>;
  allowance: string;
}) {
  const jdLen = props.jobDescription.trim().length;
  const done: [boolean, boolean, boolean] = [!!props.atsId, jdLen >= MIN_JD, !!props.resume];
  return (
    <>
      <section className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-hero px-6 py-14 text-center sm:px-10 sm:py-20">
        <div aria-hidden className="animate-float absolute top-10 left-[8%] hidden rounded-2xl bg-card/80 px-3 py-2 text-xs font-semibold text-met shadow-soft md:block">
          ✓ 9 of 11 requirements met
        </div>
        <div aria-hidden className="animate-float absolute right-[7%] bottom-12 hidden rounded-2xl bg-card/80 px-3 py-2 text-xs font-semibold text-partial shadow-soft [animation-delay:-3s] md:block">
          C → B after rewrite
        </div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card/70 px-4 py-1.5 text-sm font-semibold text-primary">
          <Gauge className="size-4" /> {ALL_ATS.length - 1} hiring systems, one honest score
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl leading-[1.08] font-medium sm:text-6xl">
          Know your score before you hit <em className="text-primary not-italic underline decoration-accent decoration-4 underline-offset-8 [text-decoration-skip-ink:none]">Apply</em>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-foreground/75">
          See exactly where your resume meets the job, and where it doesn't, on the system the employer actually
          uses. Then get a truthful rewrite and a new score.
        </p>
      </section>

      <div className="mx-auto max-w-3xl space-y-5">
        <Step n={1} done={done[0]} title="Which hiring system does the employer use?" icon={Gauge}>
          <AtsPicker value={props.atsId} onChange={props.setAtsId} />
        </Step>
        <div ref={props.jdRef}>
          <Step n={2} done={done[1]} title="Paste the job description" icon={Briefcase}>
            <Textarea
              value={props.jobDescription}
              onChange={(e) => props.setJobDescription(e.target.value)}
              placeholder="Paste the full posting: title, responsibilities, requirements, nice-to-haves…"
              className="min-h-52 rounded-2xl bg-card p-4 text-sm leading-relaxed"
              aria-label="Job description"
            />
            <p className={cn("mt-2 text-xs", jdLen > 0 && jdLen < MIN_JD ? "text-partial" : "text-muted-foreground")}>
              {jdLen > 0 && jdLen < MIN_JD
                ? "Add a bit more. The full posting gives the most accurate score."
                : "Include everything: requirements, preferred skills and duties."}
            </p>
          </Step>
        </div>
        <Step n={3} done={done[2]} title="Add your resume" icon={FileUp}>
          <ResumeDrop value={props.resume} onChange={props.setResume} />
        </Step>

        <div className="flex flex-col items-center gap-3 pt-4">
          <Button variant="hero" size="xl" disabled={!props.ready} onClick={props.onAnalyze}>
            Get my score <ArrowRight />
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {props.ready
              ? props.allowance === "Payment needed" ? "See your before score free. Your resume is never stored." : `Takes about 30 seconds. ${props.allowance}. Your resume is never stored.`
              : `${done.filter(Boolean).length} of 3 steps done`}
          </p>
        </div>
      </div>
    </>
  );
}

function Step({
  n,
  title,
  done,
  icon: Icon,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border bg-card p-5 shadow-soft sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl text-sm font-bold transition-all",
            done ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
          )}
        >
          {done ? <Icon className="size-4.5" /> : n}
        </span>
        <h2 className="text-xl font-medium sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}
