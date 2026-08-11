import { useState } from "react";
import { Lock, Delete, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  mode: "unlock" | "setup";
  correctPin?: string | null;
  onSuccess: (pin: string) => void;
  title?: string;
  description?: string;
};

export function PinModal({
  open,
  onOpenChange,
  mode,
  correctPin,
  onSuccess,
  title,
  description,
}: Props) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">(mode === "setup" ? "enter" : "enter");
  const [error, setError] = useState("");

  const handleNum = (num: string) => {
    setError("");
    if (pin.length < 4) {
      const next = pin + num;
      setPin(next);
      if (next.length === 4) {
        if (mode === "unlock") {
          if (correctPin && next !== correctPin) {
            setError("Incorrect PIN. Try again.");
            setPin("");
          } else {
            onSuccess(next);
            setPin("");
          }
        } else if (mode === "setup") {
          if (step === "enter") {
            setConfirmPin(next);
            setPin("");
            setStep("confirm");
          } else {
            if (next === confirmPin) {
              onSuccess(next);
              setPin("");
              setStep("enter");
            } else {
              setError("PINs do not match. Try again.");
              setPin("");
              setStep("enter");
            }
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  const dialogTitle =
    title ??
    (mode === "unlock"
      ? "TeleChat Locked"
      : step === "enter"
      ? "Set 4-Digit Security PIN"
      : "Confirm Security PIN");

  const dialogDesc =
    description ??
    (mode === "unlock"
      ? "Enter your PIN to continue"
      : step === "enter"
      ? "Choose a 4-digit PIN for App & Chat Lock"
      : "Re-enter your 4-digit PIN to confirm");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-3xl p-6 text-center border-sidebar-border bg-sidebar">
        <DialogHeader className="items-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl mb-2"
            style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
          >
            <img src="/splash.png" alt="TeleChat" className="size-10 object-contain" />
          </div>
          <DialogTitle className="text-lg font-bold">{dialogTitle}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{dialogDesc}</p>
        </DialogHeader>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`size-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? "bg-primary border-primary scale-110"
                  : "border-muted-foreground/40 bg-transparent"
              }`}
            />
          ))}
        </div>

        {error ? <p className="text-xs font-medium text-destructive mb-3">{error}</p> : null}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <Button
              key={num}
              variant="outline"
              onClick={() => handleNum(num)}
              className="h-14 text-xl font-semibold rounded-2xl border-sidebar-border hover:bg-sidebar-accent"
            >
              {num}
            </Button>
          ))}
          <div />
          <Button
            variant="outline"
            onClick={() => handleNum("0")}
            className="h-14 text-xl font-semibold rounded-2xl border-sidebar-border hover:bg-sidebar-accent"
          >
            0
          </Button>
          <Button
            variant="ghost"
            onClick={handleDelete}
            className="h-14 rounded-2xl hover:bg-sidebar-accent text-muted-foreground"
          >
            <Delete className="size-6" />
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground/70 mt-4">Protected by TeleChat Security</p>
      </DialogContent>
    </Dialog>
  );
}
