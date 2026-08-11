import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/telechat/otp.functions";

export function VerifyEmail({ email, onVerified }: { email: string; onVerified: () => void }) {
  const request = useServerFn(requestEmailOtp);
  const verify = useServerFn(verifyEmailOtp);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (sent) return;
    setSent(true);
    void request({ data: undefined }).catch((e: Error) => toast.error(e.message));
  }, [request, sent]);

  const submit = async () => {
    setBusy(true);
    try {
      await verify({ data: { code } });
      toast.success("Email verified 🎉");
      onVerified();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center">
        <div
          className="mx-auto flex size-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
        >
          <MailCheck className="size-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground">{email}</span>
        </p>

        <div className="mt-6 flex justify-center">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={() => void submit()}
          disabled={busy || code.length !== 6}
          className="mt-6 h-11 w-full rounded-xl"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Verify
        </Button>
        <button
          type="button"
          onClick={() => {
            void request({ data: undefined })
              .then(() => toast.success("New code sent"))
              .catch((e: Error) => toast.error(e.message));
          }}
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          Resend code
        </button>
      </div>
    </main>
  );
}
