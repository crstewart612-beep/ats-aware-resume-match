import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Briefcase, FileUp, Gauge, Square } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AtsPicker } from "@/components/resume/AtsPicker";
import { Logo } from "@/components/resume/bits";
import { ReportView } from "@/components/resume/ReportView";
import { ResumeDrop } from "@/components/resume/ResumeDrop";
import { RewriteView } from "@/components/resume/RewriteView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALL_ATS, findAts } from "@/data/ats";
import { allowanceLine } from "@/lib/entitlements";
import { stripMarkdown } from "@/lib/resume-markdown";
import type { PartialReport, PartialRewrite, Report, ResumeInput, Rewrite } from "@/lib/resume-schemas";
import { StreamRequestError, postNdjson } from "@/lib/stream-client";
import { useSession } from "@/lib/session-context";
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

type Stage = "setup" | "report" | "rewrite";
const MIN_JD = 80;

function Index() {
  const { userId, entitlement } = useSession();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("setup");
  const [atsId, setAtsId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState<ResumeInput | null>(null);
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
    } else if (e instanceof StreamRequestError && e.code === "sign_in") {
      toast("Please sign in first. Creating an account is free.");
      void navigate({ to: "/auth" });
    } else if (e instanceof StreamRequestError && e.code === "plan_required") {
      toast.error(e.message);
      void navigate({ to: "/account" });
    } else {
      const message = e instanceof StreamRequestError ? e.message : "Something went wrong. Please try again.";
      toast.error(message);
    }
    setStage(back);
  };

  const analyze = async () => {
    if (!ready || !ats || !resume) return;
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
    }
  };

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
        <button type="button" onClick={startOver} aria-label="ResumeMatch home">
          <Logo />
        </button>
        <div className="flex items-center gap-2">
          {userId ? (
            <Link to="/account">
              <Button variant="outline" size="sm">
                Your plan
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
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
            allowance={allowanceLine(entitlement, "score")}
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
              ? `Takes about 30 seconds. ${props.allowance}. Your resume is never stored.`
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
