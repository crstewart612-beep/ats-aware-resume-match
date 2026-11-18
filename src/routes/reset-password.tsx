import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/resume/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password | ResumeMatch" },
      {
        name: "description",
        content: "Set a new password for your ResumeMatch account.",
      },
      { property: "og:title", content: "Choose a new password | ResumeMatch" },
      {
        property: "og:description",
        content: "Set a new password for your ResumeMatch account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(
        error.message === "For security purposes, you can only request this after signing in"
          ? "That reset link has expired. Please request a new one."
          : error.message,
      );
      return;
    }
    toast.success("Your new password is set.");
    void navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Back to scoring
        </Link>
      </header>

      <main className="mx-auto mt-10 w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
          <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick something you don't use anywhere else, at least 8 characters.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" size="xl" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save new password"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
