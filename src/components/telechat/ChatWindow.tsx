import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Copy,
  Loader2,
  Lock,
  MoreVertical,
  Paperclip,
  Phone,
  SendHorizonal,
  ShieldAlert,
  ShieldBan,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/useChat";
import { uploadChatMedia } from "@/lib/telechat/media";
import { initialsOf, type Profile } from "@/lib/telechat/types";
import { isChatLocked, toggleChatLock } from "@/lib/telechat/security";

import { EmojiPicker } from "./EmojiPicker";
import { VerifiedBadge } from "./VerifiedBadge";

type Props = {
  me: string;
  peer: Profile;
  messages: Message[];
  online: boolean;
  blocked: boolean;
  blockedByPeer: boolean;
  onSend: (input: { body: string; kind?: string; mediaUrl?: string | null }) => Promise<void> | void;
  onDeleteForMe: (m: Message) => void;
  onDeleteForEveryone: (m: Message) => void;
  onClear: () => void;
  onBack: () => void;
  onCall: (video: boolean) => void;
  onReport: () => void;
  onToggleBlock: () => void;
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ChatWindow({
  me,
  peer,
  messages,
  online,
  blocked,
  blockedByPeer,
  onSend,
  onDeleteForMe,
  onDeleteForEveryone,
  onClear,
  onBack,
  onCall,
  onReport,
  onToggleBlock,
}: Props) {
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const pressRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState(0);

  const startPress = (id: string) => {
    pressRef.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(12);
      setMenuFor(id);
    }, 420);
  };
  const endPress = () => {
    if (pressRef.current) window.clearTimeout(pressRef.current);
    pressRef.current = null;
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peer.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    try {
      await onSend({ body: text });
    } catch {
      toast.error("Message could not be sent. Check your connection.");
    }
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadChatMedia(me, file);
      const kind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file";
      await onSend({ body: file.name, kind, mediaUrl: url });
    } catch {
      toast.error("Upload failed. Please try a smaller file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // WhatsApp-style swipe-from-left-edge to go back to the chat list.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t || t.clientX > 40) return;
    swipe.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const start = swipe.current;
    const t = e.touches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = Math.abs(t.clientY - start.y);
    if (dy > 40) {
      swipe.current = null;
      setDrag(0);
      return;
    }
    setDrag(Math.max(0, Math.min(dx, 140)));
  };
  const onTouchEnd = () => {
    if (drag > 70) onBack();
    swipe.current = null;
    setDrag(0);
  };

  return (
    <section
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={drag ? { transform: `translateX(${drag}px)`, opacity: 1 - drag / 400 } : undefined}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col bg-chat-canvas",
        drag === 0 && "transition-transform duration-200",
      )}
    >
      <header className="flex items-center gap-1 border-b border-border bg-card/80 px-2 py-2.5 backdrop-blur md:gap-2 md:px-5">
        <button onClick={onBack} className="rounded-full p-1.5 hover:bg-accent md:hidden" aria-label="Back to chats">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar className="size-10">
          <AvatarImage src={peer.avatar_url ?? undefined} alt={`${peer.username} profile picture`} />
          <AvatarFallback>{initialsOf(peer)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 pl-1">
          <p className="flex items-center gap-1 truncate font-semibold">
            <span className="truncate">{peer.display_name || peer.username}</span>
            {peer.verified ? <VerifiedBadge className="size-4" /> : null}
          </p>
          <p className={cn("text-xs", online ? "text-primary" : "text-muted-foreground")}>
            {blocked ? "blocked" : online ? "online" : "last seen recently"}
          </p>
        </div>
        <button
          onClick={() => onCall(false)}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          aria-label="Voice call"
        >
          <Phone className="size-5" />
        </button>
        <button
          onClick={() => onCall(true)}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          aria-label="Video call"
        >
          <Video className="size-5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full p-2 text-muted-foreground hover:bg-accent" aria-label="Chat options">
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl">
            <DropdownMenuItem onClick={onClear}>
              <Trash2 className="size-4" /> Clear chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              const locked = toggleChatLock(peer.id);
              toast.success(locked ? `Chat with ${peer.display_name || peer.username} locked` : "Chat unlocked");
            }}>
              <Lock className="size-4" /> {isChatLocked(peer.id) ? "Unlock chat" : "Lock chat (PIN)"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleBlock}>
              <ShieldBan className="size-4" /> {blocked ? "Unblock" : "Block"} {peer.username}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onReport}>
              <ShieldAlert className="size-4" /> Report to TeleChat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-5 md:px-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 15%, oklch(0.72 0.14 189 / 0.08), transparent 45%), radial-gradient(circle at 80% 80%, oklch(0.62 0.16 245 / 0.08), transparent 45%)",
        }}
      >
        {messages.length === 0 ? (
          <p className="mx-auto mt-16 max-w-xs rounded-2xl bg-card/70 px-4 py-3 text-center text-sm text-muted-foreground">
            Say hello 👋 — messages are delivered instantly, and wait safely until your friend is
            back online.
          </p>
        ) : null}

        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div
              key={m.id}
              className={cn(
                "flex animate-in fade-in slide-in-from-bottom-2 duration-200",
                mine ? "justify-end" : "justify-start",
              )}
            >
              <DropdownMenu
                open={menuFor === m.id}
                onOpenChange={(o) => setMenuFor(o ? m.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    onPointerDown={() => startPress(m.id)}
                    onPointerUp={endPress}
                    onPointerLeave={endPress}
                    onPointerCancel={endPress}
                    onClick={(e) => e.preventDefault()}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuFor(m.id);
                    }}
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-left text-sm shadow-sm transition-transform select-none md:max-w-[60%]",
                      menuFor === m.id && "scale-[0.97]",
                      mine
                        ? "rounded-br-md bg-bubble-out text-bubble-out-foreground"
                        : "rounded-bl-md bg-bubble-in text-bubble-in-foreground",
                    )}
                  >
                    {m.deleted_for_all ? (
                      <p className="flex items-center gap-1.5 text-sm italic opacity-70">
                        <Ban className="size-3.5" /> This message was deleted
                      </p>
                    ) : m.kind === "sticker" ? (
                      <span className="text-5xl">{m.body}</span>
                    ) : m.kind === "image" && m.media_url ? (
                      <img
                        src={m.media_url}
                        alt={m.body || "Shared image"}
                        loading="lazy"
                        className="max-h-72 rounded-xl object-cover"
                      />
                    ) : m.media_url ? (
                      <a href={m.media_url} target="_blank" rel="noreferrer" className="underline">
                        {m.body || "Attachment"}
                      </a>
                    ) : (
                      <p className="break-words whitespace-pre-wrap">{m.body}</p>
                    )}
                    <span className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                      {timeLabel(m.created_at)}
                      {mine ? (
                        m.read_at ? (
                          <CheckCheck className="size-3 text-primary" />
                        ) : m.delivered_at ? (
                          <CheckCheck className="size-3" />
                        ) : (
                          <Check className="size-3" />
                        )
                      ) : null}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={mine ? "end" : "start"} className="rounded-2xl">
                  {!m.deleted_for_all && !m.media_url ? (
                    <DropdownMenuItem
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.body);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="size-4" /> Copy
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={() => onDeleteForMe(m)}>
                    <Trash2 className="size-4" /> Delete for me
                  </DropdownMenuItem>
                  {mine && !m.deleted_for_all ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDeleteForEveryone(m)}
                    >
                      <Ban className="size-4" /> Delete for everyone
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {blocked || blockedByPeer ? (
        <div className="border-t border-border bg-card/80 px-4 py-5 text-center text-sm text-muted-foreground">
          {blocked ? (
            <>
              You blocked this contact.{" "}
              <button onClick={onToggleBlock} className="font-medium text-primary">
                Unblock
              </button>
            </>
          ) : (
            "You can no longer message this contact."
          )}
        </div>
      ) : (
      <form
        onSubmit={submit}
        className="flex items-center gap-1.5 border-t border-border bg-card/80 px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur md:px-6 md:pb-3"
      >
        <EmojiPicker
          onPick={(e) => setDraft((d) => d + e)}
          onSticker={(s) => void onSend({ body: s, kind: "sticker" })}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => void pickFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Attach a file"
        >
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
        </button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message"
          className="h-12 min-w-0 rounded-full border-0 bg-secondary px-5 text-base focus-visible:ring-1"
        />
        <Button
          type="submit"
          disabled={!draft.trim()}
          className="size-12 shrink-0 rounded-full p-0 transition-transform hover:scale-105 active:scale-95"
          style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
          aria-label="Send message"
        >
          <SendHorizonal className="size-5" />
        </Button>
      </form>
      )}
    </section>
  );
}