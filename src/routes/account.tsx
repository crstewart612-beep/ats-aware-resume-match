import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, KeyRound, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/resume/bits";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/lib/access-context";
import { PACK_PRICE_ID, PLAN_BENEFITS, PLAN_NAME, PLAN_PRICE } from "@/lib/entitlements";
import { getPaddlePriceId, initializePaddle } from "@/lib/paddle";
import { codeForPayment } from "@/utils/access.functions";

const PENDING_KEY = "rm_pending_payment";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Get reports | ResumeMatch" },
      { name: "description", content: "Buy a one-time ResumeMatch pack of 10 reports and get your access code. No account needed." },
      { property: "og:title", content: "Get reports | ResumeMatch" },
      { property: "og:description", content: "One payment of $19 for 10 reports. No account, nothing renews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { code, status, allowance, useCode, clearCode } = useAccess();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [entry, setEntry] = useState("");
  const [newCode, setNewCode] = useState<string | null>(null);

  // After paying, the code is created a few seconds later; check until it appears.
  const waitForCode = useCallback(
    async (transactionId: string) => {
      setWaiting(true);
      for (let i = 0; i < 100; i++) {
        // A dropped connection just means "try again in a moment".
        const c = await codeForPayment({ data: { transactionId } }).then((r) => r.code, () => null);
        if (c) {
          localStorage.removeItem(PENDING_KEY);
          await useCode(c);
          setNewCode(c);
          setWaiting(false);
          toast.success("Thank you! Your 10 reports are ready.");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setWaiting(false);
      toast.error("Your payment went through, but the code is slow to arrive. Refresh this page in a minute.");
    },
    [useCode],
  );

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending) void waitForCode(pending);
  }, [waitForCode]);

  const buy = async () => {
    setBusy(true);
    try {
      await initializePaddle();
      window.Paddle.Update({
        eventCallback: (e: any) => {
          if (e?.name === "checkout.completed" && e.data?.transaction_id) {
            localStorage.setItem(PENDING_KEY, e.data.transaction_id);
            window.Paddle.Checkout.close();
            void waitForCode(e.data.transaction_id);
          }
        },
      });
      const priceId = await getPaddlePriceId(PACK_PRICE_ID);
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/account`,
          variant: "one-page",
        },
      });
    } catch {
      toast.error("Checkout couldn't open. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const enter = async () => {
    const ok = await useCode(entry).catch(() => null);
    if (ok === null) {
      toast.error("We couldn't reach the server. Check your connection and try again.");
      return;
    }
    if (!ok) {
      toast.error("That code wasn't found. Check the letters and try again.");
      return;
    }
    setEntry("");
    toast.success("Code added.");
  };

  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c);
      toast.success("Code copied.");
    } catch {
      toast.error("Copy was blocked. Write the code down instead.");
    }
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
          {waiting && (
            <Panel>
              <h1 className="font-display text-2xl font-semibold">Creating your access code...</h1>
              <p className="mt-2 text-sm text-muted-foreground">This can take up to a few minutes. Please keep this page open.</p>
            </Panel>
          )}

          {(newCode ?? code) && (
            <Panel>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your access code</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-3xl font-semibold tracking-wider">{newCode ?? code}</span>
                <Button variant="outline" size="sm" onClick={() => copy((newCode ?? code)!)}>
                  <Copy /> Copy
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Save this code. It's already active on this device. To use your reports on another phone or computer, type it in below.
              </p>
              {status && (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Stat label="Score reports" value={`${status.scoresLeft} of ${status.reports} left`} />
                  <Stat label="Rewrites" value={`${status.rewritesLeft} of ${status.reports} left`} />
                </dl>
              )}
              <button type="button" className="mt-4 text-xs text-muted-foreground underline" onClick={clearCode}>
                Remove code from this device
              </button>
            </Panel>
          )}

          {!code && !newCode && (
            <Panel>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Your reports</p>
              <h1 className="mt-1 font-display text-3xl font-semibold">{allowance || "\u00a0"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">One payment of $19 for 10 reports. No account needed.</p>
            </Panel>
          )}

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
              <li className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                No account or sign-in. You get an access code right after paying.
              </li>
            </ul>
            <Button size="xl" className="mt-6" onClick={buy} disabled={busy || waiting}>
              {busy ? "Opening checkout..." : "Buy 10 reports for $19"} <ArrowRight />
            </Button>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 text-primary">
              <KeyRound className="size-5" />
              <h2 className="font-display text-xl font-semibold">Already have a code?</h2>
            </div>
            <form
              className="mt-4 flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void enter();
              }}
            >
              <Input
                aria-label="Access code"
                placeholder="ABCD-EFGH-JKLM"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                className="font-mono uppercase"
              />
              <Button type="submit" disabled={entry.trim().length < 12}>
                Use code
              </Button>
            </form>
          </Panel>

          <p className="px-2 text-xs text-muted-foreground">
            We keep only your access code and how many reports it has used. Your resume and job descriptions are never stored.
          </p>
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
