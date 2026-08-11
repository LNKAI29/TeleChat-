import { useState } from "react";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { initialsOf, type Profile } from "@/lib/telechat/types";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId: string;
  onAdded: (profile: Profile) => void;
};

export function NewChatDialog({ open, onOpenChange, ownerId, onAdded }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim().replace(/^@/, "").toLowerCase();
    if (q.length < 2) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, cover_url, peer_id")
      .ilike("username", `%${q}%`)
      .neq("id", ownerId)
      .limit(10);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResults((data ?? []) as Profile[]);
  };

  const add = async (profile: Profile) => {
    const { error } = await supabase
      .from("contacts")
      .insert({ owner_id: ownerId, contact_id: profile.id });
    if (error && error.code !== "23505") {
      toast.error(error.message);
      return;
    }
    onAdded(profile);
    onOpenChange(false);
    setTerm("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a new chat</DialogTitle>
          <DialogDescription>Find someone by their TeleChat username.</DialogDescription>
        </DialogHeader>

        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="@username"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button type="submit" disabled={busy} className="h-11 rounded-xl">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-accent"
            >
              <Avatar className="size-11">
                <AvatarImage src={p.avatar_url ?? undefined} alt={p.username ?? "user"} />
                <AvatarFallback>{initialsOf(p)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.display_name || p.username}</p>
                <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
              </div>
              <UserPlus className="size-4 text-primary" />
            </button>
          ))}
          {!busy && term && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches yet.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}