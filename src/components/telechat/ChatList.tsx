import { useState } from "react";
import { VerifiedBadge } from "./VerifiedBadge";
import { Lock, MessageSquarePlus, MessagesSquare, Search } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/useChat";
import { initialsOf, type Profile } from "@/lib/telechat/types";
import { getSecurityState, isChatLocked } from "@/lib/telechat/security";
import { PinModal } from "./PinModal";

type Props = {
  me: Profile;
  contacts: Profile[];
  activeId: string | null;
  onlineIds: string[];
  threads: Map<string, Message[]>;
  query: string;
  onQuery: (v: string) => void;
  onSelect: (p: Profile) => void;
  onOpenProfile: () => void;
  onNewChat: () => void;
  className?: string;
};

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const previewText = (m: Message) => {
  if (m.deleted_for_all) return "This message was deleted";
  if (m.kind === "image") return "📷 Photo";
  if (m.kind === "video") return "🎬 Video";
  if (m.kind === "sticker") return m.body;
  if (m.kind === "file") return "📎 File";
  return m.body;
};

export function ChatList({
  me,
  contacts,
  activeId,
  onlineIds,
  threads,
  query,
  onQuery,
  onSelect,
  onOpenProfile,
  onNewChat,
  className,
}: Props) {
  const [lockedContactPending, setLockedContactPending] = useState<Profile | null>(null);

  const handleSelectContact = (c: Profile) => {
    if (isChatLocked(c.id)) {
      setLockedContactPending(c);
    } else {
      onSelect(c);
    }
  };

  const filtered = contacts
    .filter((c) =>
      `${c.display_name ?? ""} ${c.username ?? ""}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const la = threads.get(a.id)?.at(-1)?.created_at ?? "";
      const lb = threads.get(b.id)?.at(-1)?.created_at ?? "";
      return lb.localeCompare(la);
    });

  return (
    <aside
      className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar", className)}
    >
      <header className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.875rem)] pb-3.5">
        <button
          onClick={onOpenProfile}
          className="transition-transform hover:scale-105"
          aria-label="Open your profile"
        >
          <Avatar className="size-10 ring-2 ring-primary/40">
            <AvatarImage src={me.avatar_url ?? undefined} alt="Your profile picture" />
            <AvatarFallback>{initialsOf(me)}</AvatarFallback>
          </Avatar>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tracking-tight">TeleChat</p>
          <p className="truncate text-xs text-muted-foreground">@{me.username}</p>
        </div>
      </header>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search chats"
            className="h-11 rounded-full border-0 bg-secondary pl-10 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:pb-6">
        {filtered.map((c) => {
          const thread = threads.get(c.id) ?? [];
          const preview = thread.at(-1);
          const unread = thread.filter((m) => m.sender_id === c.id && !m.read_at).length;
          const online = onlineIds.includes(c.id);
          const isLocked = isChatLocked(c.id);
          return (
            <button
              key={c.id}
              onClick={() => handleSelectContact(c)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors",
                activeId === c.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
              )}
            >
              <div className="relative">
                <Avatar className="size-[3.25rem]">
                  <AvatarImage
                    src={c.avatar_url ?? undefined}
                    alt={`${c.username} profile picture`}
                  />
                  <AvatarFallback>{initialsOf(c)}</AvatarFallback>
                </Avatar>
                {online ? (
                  <span className="absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-sidebar bg-primary" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="flex min-w-0 items-center gap-1 font-semibold">
                    <span className="truncate">{c.display_name || c.username}</span>
                    {c.verified ? <VerifiedBadge className="size-4" /> : null}
                    {isLocked ? <Lock className="size-3.5 text-primary ml-1" /> : null}
                  </p>
                  {preview ? (
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {dayLabel(preview.created_at)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {isLocked ? (
                      <span className="italic text-muted-foreground/80 font-medium">🔒 Chat locked</span>
                    ) : preview ? (
                      `${preview.sender_id === me.id ? "You: " : ""}${previewText(preview)}`
                    ) : (
                      `@${c.username}`
                    )}
                  </p>
                  {unread > 0 ? (
                    <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                      {unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <MessagesSquare className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No chats yet. Tap the button and search a username to start talking.
            </p>
          </div>
        ) : null}
      </div>

      <button
        onClick={onNewChat}
        className="absolute right-5 bottom-[calc(env(safe-area-inset-bottom)+6rem)] flex size-14 items-center justify-center rounded-2xl text-primary-foreground transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
        aria-label="Start a new chat"
      >
        <MessageSquarePlus className="size-6" />
      </button>

      <PinModal
        open={Boolean(lockedContactPending)}
        onOpenChange={(o) => {
          if (!o) setLockedContactPending(null);
        }}
        mode="unlock"
        correctPin={getSecurityState().pin}
        onSuccess={() => {
          if (lockedContactPending) {
            onSelect(lockedContactPending);
            setLockedContactPending(null);
          }
        }}
        title="Locked Chat"
        description={
          lockedContactPending
            ? `Enter PIN to open chat with ${lockedContactPending.display_name || lockedContactPending.username}`
            : "Enter PIN"
        }
      />
    </aside>
  );
}
