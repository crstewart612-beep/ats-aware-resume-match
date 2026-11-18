import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, LogOut, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/resume/bits";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import {
  allowanceLine,
  hasPurchased,
  PACK_PRICE_ID,
  PLAN_BENEFITS,
  PLAN_NAME,
  PLAN_PRICE,
  scoreAllowed,
} from "@/lib/entitlements";
import { getPaddlePriceId, initializePaddle } from "@/lib/paddle";
import { useSession } from "@/lib/session-context";

export const Route = createFileRoute("/account")({
  validateSearch: (s: Record<string, unknown>): { checkout?: "success" } =>
    s["checkout"] === "success" ? { checkout: "success" } : {},
  head: () => ({
    meta: [
      { title: "Your reports | ResumeMatch" },
      { name: "description", content: "See how many ResumeMatch reports you have left and buy a 10-report pack." },
      { property: "og:title", content: "Your reports | ResumeMatch" },
      { property: "og:description", content: "Buy a one-time 10-report pack. Nothing renews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { userId, email, ready, entitlement, signOut, refresh } = useSession();
  const { checkout } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // After paying, the purchase lands a few seconds later; check a few times.
  useEffect(() => {
    if (checkout !== "success" || !userId) return;
    toast.success("Thank you! Your reports are being added.");
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      void refresh();
      if (n >= 6) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [checkout, userId, refresh]);

  const buy = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await initializePaddle();
      const priceId = await getPaddlePriceId(PACK_PRICE_ID);
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: { userId },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/account?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch {
      toast.error("Checkout couldn't open. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="px-4 py-10">
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
              <h1 className="font-display text-2xl font-semibold">Sign in to see your reports</h1>
              <p className="mt-2 text-sm text-muted-foreground">Your free report and any packs you buy are tied to your account.</p>
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
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your reports</p>
                    <h1 className="mt-1 font-display text-3xl font-semibold">{allowanceLine(entitlement, "score")}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Signed in as {email}. {hasPurchased(entitlement) ? "Thanks for your purchase." : "Your first report is free."}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={leave}>
                    <LogOut /> Sign out
                  </Button>
                </div>
                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Stat label="Score reports" value={allowanceLine(entitlement, "score")} />
                  <Stat label="Rewrites" value={allowanceLine(entitlement, "rewrite")} />
                </dl>
              </Panel>

              <Panel>
                <div className="flex items-center gap-2 text-primary">
                  <ShoppingBag className="size-5" />
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
                <Button size="xl" className="mt-6" onClick={buy} disabled={busy}>
                  {busy ? "Opening checkout..." : scoreAllowed(entitlement) ? "Buy 10 more reports" : "Buy 10 reports"} <ArrowRight />
                </Button>
              </Panel>

              <p className="px-2 text-xs text-muted-foreground">
                We keep only your account and how many reports you've used. Your resume and job descriptions are never stored.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-[2rem] border border-border bg-card p-6 shadow-soft sm:p-8">{children}</section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
