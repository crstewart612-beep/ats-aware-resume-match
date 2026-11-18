import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, CreditCard, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/resume/bits";
import { Button } from "@/components/ui/button";
import { allowanceLine, PLAN_BENEFITS, PLAN_NAME, PLAN_PRICE } from "@/lib/entitlements";
import { useSession } from "@/lib/session-context";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your plan | ResumeMatch" },
      {
        name: "description",
        content: "See your ResumeMatch plan, your free allowance this month, and what a plan unlocks.",
      },
      { property: "og:title", content: "Your plan | ResumeMatch" },
      {
        property: "og:description",
        content: "See your ResumeMatch plan and what a plan unlocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { userId, email, ready, entitlement, signOut } = useSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const leave = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    void navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to scoring
        </Link>
      </header>

      <main className="mx-auto mt-8 w-full max-w-3xl space-y-5">
        {!ready ? null : !userId ? (
          <Panel>
            <h1 className="font-display text-2xl font-semibold">Sign in to see your plan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your free monthly allowance and anything you subscribe to are tied to your account.
            </p>
            <Link to="/auth" className="mt-6 inline-flex">
              <Button size="xl">
                Sign in or create an account <ArrowRight />
              </Button>
            </Link>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Current plan
                  </p>
                  <h1 className="mt-1 font-display text-3xl font-semibold">
                    {entitlement.paid ? PLAN_NAME : "Free"}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {entitlement.paid
                      ? "Thanks for supporting ResumeMatch. Everything is unlocked."
                      : `Signed in as ${email}. ${allowanceLine(entitlement, "score")}.`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={leave}
                  disabled={signingOut}
                  aria-label="Sign out"
                >
                  <LogOut /> {signingOut ? "Signing out..." : "Sign out"}
                </Button>
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <Stat
                  label="Score reports this month"
                  value={entitlement.paid ? "Unlimited" : allowanceLine(entitlement, "score")}
                />
                <Stat
                  label="Rewrites this month"
                  value={entitlement.paid ? "Unlimited" : allowanceLine(entitlement, "rewrite")}
                />
              </dl>
            </Panel>

            {!entitlement.paid && (
              <Panel>
                <div className="flex items-center gap-2 text-primary">
                  <CreditCard className="size-5" />
                  <h2 className="font-display text-2xl font-semibold">{PLAN_NAME}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{PLAN_PRICE}</p>
                <ul className="mt-5 space-y-2.5">
                  {PLAN_BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">
                  Checkout opens here as soon as payments are connected to the site.
                </p>
              </Panel>
            )}

            <p className="px-2 text-xs text-muted-foreground">
              We keep only your account, your plan and how many reports you've used. Your resume and
              your job descriptions are never stored.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
