import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/resume/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to ResumeMatch" },
      {
        name: "description",
        content: "Sign in or create a free ResumeMatch account to score your resume and rewrite it.",
      },
      { property: "og:title", content: "Sign in to ResumeMatch" },
      {
        property: "og:description",
        content: "Sign in or create a free ResumeMatch account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const finish = () => {
    void navigate({ to: "/" });
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in didn't work. Please try again.");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    finish();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setResetSent(false);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      if (!data.session) {
        setAwaitingConfirm(true);
        setBusy(false);
        return;
      }
      finish();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "That email and password don't match. Try again or reset your password."
          : error.message,
      );
      setBusy(false);
      return;
    }
    finish();
  };

  const reset = async () => {
    if (!email) {
      toast.error("Type your email first, then press Send reset link.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <header className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to scoring
        </Link>
      </header>

      <main className="mx-auto mt-10 w-full max-md max-w-md">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
          {awaitingConfirm ? (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold">Check your email</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating
                your account, then come back and sign in.
              </p>
              <Button className="mt-6 w-full" variant="soft" size="xl" onClick={finish}>
                Back to scoring
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to pick up where you left off and see your plan."
                  : "Free to start: a few score reports and a rewrite each month, no card needed."}
              </p>

              <Button
                type="button"
                variant="outline"
                size="xl"
                className="mt-6 w-full border-[#747775] bg-white text-[#1F1F1F] hover:bg-[#F2F2F2]"
                onClick={google}
                disabled={busy}
              >
                <GoogleMark />
                <span className="ml-1">Continue with Google</span>
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with your email
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" size="xl" className="w-full" disabled={busy}>
                  {busy
                    ? "One moment..."
                    : mode === "signin"
                      ? "Sign in"
                      : "Create free account"}
                </Button>
              </form>

              {mode === "signin" ? (
                <div className="mt-4 space-y-2 text-sm">
                  <button
                    type="button"
                    className="text-primary underline underline-offset-4"
                    onClick={reset}
                    disabled={busy}
                  >
                    Forgot your password?
                  </button>
                  {resetSent && (
                    <p className="text-muted-foreground">
                      If that email has an account, a reset link is on its way.
                    </p>
                  )}
                </div>
              ) : null}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-4"
                      onClick={() => setMode("signup")}
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary underline underline-offset-4"
                      onClick={() => setMode("signin")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your resume is never stored. Sign in only keeps your report count
          straight.
        </p>
      </main>
    </div>
  );
}
