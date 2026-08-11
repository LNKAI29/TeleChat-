import { useState } from "react";
import { AtSign, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

function makePeerId() {
  return `tc-${crypto.randomUUID().replace(/-/g, "")}`;
}

export function UsernameSetup({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const valid = clean.length >= 3 && clean.length <= 20;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: clean,
        display_name: displayName.trim() || clean,
        peer_id: makePeerId(),
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "That username is already taken." : error.message,
      );
      return;
    }
    toast.success("Welcome to TeleChat!");
    onDone();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-3xl border border-border bg-card p-7 duration-500"
        style={{ boxShadow: "var(--shadow-panel)" }}
      >
        <div
          className="flex size-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
        >
          <AtSign className="size-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Pick your username</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is how friends find you. You can choose it only once — it is permanent.
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-input/40 px-3">
            <span className="text-muted-foreground">@</span>
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              className="h-12 border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="h-12 rounded-xl"
          />
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          3–20 characters, letters, numbers and underscores. Your permanent chat ID is
          created and saved automatically.
        </p>

        <Button type="submit" disabled={!valid || busy} className="mt-6 h-12 w-full rounded-xl">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Claim @{clean || "username"}
        </Button>
      </form>
    </main>
  );
}