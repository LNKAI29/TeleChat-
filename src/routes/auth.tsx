import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessagesSquare, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, resetPasswordWithOtp } from "@/lib/telechat/reset.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to TeleChat — Private P2P Messaging" },
      {
        name: "description",
        content:
          "Sign in to TeleChat with your email and start private chats with your permanent username.",
      },
      { property: "og:title", content: "Sign in to TeleChat" },
      {
        property: "og:description",
        content: "Private peer-to-peer messaging with a permanent username.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const sendReset = useServerFn(requestPasswordReset);
  const doReset = useServerFn(resetPasswordWithOtp);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/" });
  }, [loading, session, navigate]);

  const withEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    const { data, error } = await fn;
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup" && !data.session) {
      toast.success("Account created. Sign in to verify your email with a code.");
      setMode("signin");
      return;
    }
    void navigate({ to: "/" });
  };

  const askCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendReset({ data: { email } });
      toast.success("If that email exists, a reset code is on the way.");
      setCode("");
      setPassword("");
      setMode("reset");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await doReset({ data: { email, code, password } });
      toast.success("Password updated. Sign in with your new password.");
      setCode("");
      setPassword("");
      setMode("signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset the password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--brand-gradient)" }}
      />
      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="mb-8 text-center">
          <div
            className="mx-auto flex size-16 items-center justify-center rounded-3xl"
            style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
          >
            <MessagesSquare className="size-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">TeleChat</h1>
        </div>

        <div
          className="rounded-3xl border border-border bg-card p-6"
          style={{ boxShadow: "var(--shadow-panel)" }}
        >
          {mode === "forgot" ? (
            <form onSubmit={askCode} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" /> Back to sign in
              </button>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Send reset code
              </Button>
            </form>
          ) : mode === "reset" ? (
            <form onSubmit={confirmReset} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="size-4" /> Change email
              </button>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="text-foreground">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                disabled={busy || code.length !== 6}
                className="h-11 w-full rounded-xl"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={withEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" ? (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    ) : null}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" disabled={busy} className="h-11 w-full rounded-xl">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
