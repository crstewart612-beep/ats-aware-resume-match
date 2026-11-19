import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/resume/bits";
import { Button } from "@/components/ui/button";

export const SUPPORT_EMAIL = "Charlene.Stewart4@outlook.com";
export const SELLER_NAME = "Charlene Brooks";

export function LegalFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-6 text-xs text-muted-foreground sm:px-8">
        <Link to="/terms" className="transition-colors hover:text-foreground">
          Terms &amp; Conditions
        </Link>
        <Link to="/refund-policy" className="transition-colors hover:text-foreground">
          Refund Policy
        </Link>
        <Link to="/privacy" className="transition-colors hover:text-foreground">
          Privacy Notice
        </Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-foreground">
          {SUPPORT_EMAIL}
        </a>
      </div>
    </footer>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Resume Match home">
          <Logo />
        </Link>
        <Link to="/">
          <Button variant="outline" size="sm">
            Back to app
          </Button>
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: November 19, 2026</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>
      <LegalFooter />
    </div>
  );
}
