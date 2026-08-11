import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reportToTeleChat } from "@/lib/telechat/report.functions";
import type { Profile } from "@/lib/telechat/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  peer: Profile;
};

export function ReportDialog({ open, onOpenChange, peer }: Props) {
  const [reason, setReason] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const name = peer.display_name || peer.username;

  const submit = async () => {
    if (!agree) return;
    setBusy(true);
    try {
      const res = await reportToTeleChat({ data: { reportedId: peer.id, reason } });
      onOpenChange(false);
      setReason("");
      setAgree(false);
      toast.success(
        res.banned
          ? `Report reviewed — ${name}'s account has been banned.`
          : `Report sent. ${res.reviewed} messages were reviewed and no violation was found.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" />
            Report {name} to TeleChat
          </DialogTitle>
          <DialogDescription>
            The last 25 messages of this chat will be sent to LNK Official for review. The account is
            banned only if the review finds a real violation.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="What happened? (optional)"
          className="rounded-2xl"
        />

        <label className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-3 text-sm">
          <Checkbox
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            I agree to send the last 25 messages of this chat to LNK Official for review.
          </span>
        </label>

        <Button
          disabled={!agree || busy}
          onClick={() => void submit()}
          variant="destructive"
          className="h-11 w-full rounded-xl"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Report and send messages
        </Button>
      </DialogContent>
    </Dialog>
  );
}