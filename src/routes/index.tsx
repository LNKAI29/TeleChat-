import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessagesSquare, Phone, Users, MessageCircle, UserRound } from "lucide-react";
import { toast } from "sonner";

import { ChatList } from "@/components/telechat/ChatList";
import { ChatWindow } from "@/components/telechat/ChatWindow";
import { CallsPanel } from "@/components/telechat/CallsPanel";
import { NewChatDialog } from "@/components/telechat/NewChatDialog";
import { ProfileSheet } from "@/components/telechat/ProfileSheet";
import { SettingsPanel } from "@/components/telechat/SettingsPanel";
import { UsernameSetup } from "@/components/telechat/UsernameSetup";
import { VerifyEmail } from "@/components/telechat/VerifyEmail";
import { CallOverlay } from "@/components/telechat/CallOverlay";
import { ReportDialog } from "@/components/telechat/ReportDialog";
import { VerifiedBadge } from "@/components/telechat/VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useBlocks } from "@/hooks/useBlocks";
import { useCall } from "@/hooks/useCall";
import { useChat } from "@/hooks/useChat";
import { usePush } from "@/hooks/usePush";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { addCall, clearCalls, loadCalls, type CallLog } from "@/lib/telechat/calls";
import { initialsOf, type Profile } from "@/lib/telechat/types";
import { getSecurityState } from "@/lib/telechat/security";
import { PinModal } from "@/components/telechat/PinModal";
import { playNotificationTone } from "@/lib/telechat/audio";

const PROFILE_COLUMNS =
  "id, username, display_name, about, avatar_url, cover_url, peer_id, email_verified, banned, verified";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeleChat — Private Messenger with Calls" },
      {
        name: "description",
        content:
          "TeleChat is a private messenger with a permanent username, instant delivery, photos, stickers and voice or video calls.",
      },
      { property: "og:title", content: "TeleChat — Private Messenger with Calls" },
      {
        property: "og:description",
        content:
          "Chat, share photos and stickers, and make voice or video calls with a permanent username.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeleChat,
});

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between py-12 px-6 bg-background">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div
          className="flex size-24 items-center justify-center rounded-3xl p-4 transition-transform duration-500 animate-pulse"
          style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
        >
          <img src="/splash.png" alt="TeleChat Logo" className="size-full object-contain drop-shadow-lg" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">TeleChat</h1>
          <p className="text-xs text-muted-foreground">Fast, Private & Encrypted</p>
        </div>
        <Loader2 className="size-6 animate-spin text-primary mt-2" />
      </div>
      <div className="flex flex-col items-center gap-1 opacity-85">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">From</p>
        <p className="text-sm font-bold tracking-wide text-foreground">LNK Official</p>
      </div>
    </div>
  );
}

type Tab = "chats" | "calls" | "contacts" | "account";

function TeleChat() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("chats");
  const [profileOpen, setProfileOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [booted, setBooted] = useState(false);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [appLocked, setAppLocked] = useState(() => getSecurityState().isAppLockEnabled);

  const chat = useChat(user?.id ?? null);
  const call = useCall(profile?.peer_id ?? null);
  const blocks = useBlocks(user?.id ?? null);
  const push = usePush(user?.id ?? null, notifications);

  // Play notification sound on new incoming message
  const prevMsgCount = useRef(chat.messages.length);
  useEffect(() => {
    if (chat.messages.length > prevMsgCount.current) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      if (lastMsg && lastMsg.sender_id !== user?.id) {
        playNotificationTone();
      }
    }
    prevMsgCount.current = chat.messages.length;
  }, [chat.messages, user?.id]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore — always leave the session locally */
    }
    try {
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.replace("/auth");
  }, []);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) setCalls(loadCalls(user.id));
  }, [user]);

  const loadContacts = useCallback(async (ownerId: string) => {
    const { data } = await supabase
      .from("contacts")
      .select(`contact:profiles!contacts_contact_id_fkey(${PROFILE_COLUMNS})`)
      .eq("owner_id", ownerId);
    const list = ((data ?? []) as unknown as { contact: Profile | null }[])
      .map((row) => row.contact)
      .filter((c): c is Profile => Boolean(c));
    setContacts(list);
  }, []);

  const refreshProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      await refreshProfile(user.id);
      if (cancelled) return;
      await loadContacts(user.id);
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadContacts, refreshProfile]);

  const active = useMemo(
    () => contacts.find((c) => c.id === activeId) ?? null,
    [contacts, activeId],
  );

  // Anyone who messages us becomes a contact automatically.
  useEffect(() => {
    if (!user) return;
    const unknown = chat.messages
      .map((m) => (m.sender_id === user.id ? m.recipient_id : m.sender_id))
      .filter((id) => id !== user.id && !contacts.some((c) => c.id === id));
    if (unknown.length === 0) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .in("id", Array.from(new Set(unknown)));
      const found = (data as Profile[] | null) ?? [];
      if (found.length === 0) return;
      setContacts((prev) => [...prev, ...found.filter((f) => !prev.some((p) => p.id === f.id))]);
      await supabase.from("contacts").upsert(
        found.map((f) => ({ owner_id: user.id, contact_id: f.id })),
        { onConflict: "owner_id,contact_id", ignoreDuplicates: true },
      );
    })();
  }, [chat.messages, contacts, user]);

  useEffect(() => {
    if (active && readReceipts) void chat.markRead(active.id);
  }, [active, chat, readReceipts, chat.messages.length]);

  // Record voice and video call history on this device.
  const callMeta = useRef<{ peer: Profile | null; video: boolean; startedAt: number; connected: boolean; direction: "in" | "out" } | null>(null);
  const prevStatus = useRef(call.state.status);
  useEffect(() => {
    const status = call.state.status;
    const prev = prevStatus.current;
    prevStatus.current = status;
    if (!user) return;
    if (prev === "idle" && (status === "calling" || status === "incoming")) {
      callMeta.current = {
        peer: active,
        video: call.state.video,
        startedAt: Date.now(),
        connected: false,
        direction: status === "incoming" ? "in" : "out",
      };
    }
    if (status === "active" && callMeta.current) {
      callMeta.current.connected = true;
      callMeta.current.startedAt = Date.now();
    }
    if (prev !== "idle" && status === "idle" && callMeta.current) {
      const meta = callMeta.current;
      callMeta.current = null;
      const log: CallLog = {
        id: crypto.randomUUID(),
        peerId: meta.peer?.id ?? "",
        peerName: meta.peer?.display_name || meta.peer?.username || "Unknown",
        avatar: meta.peer?.avatar_url ?? null,
        video: meta.video,
        direction: meta.direction,
        missed: !meta.connected,
        seconds: meta.connected ? Math.round((Date.now() - meta.startedAt) / 1000) : 0,
        at: Date.now(),
      };
      setCalls(addCall(user.id, log));
    }
  }, [call.state.status, call.state.video, active, user]);

  if (loading || (user && !booted)) return <Splash />;
  if (!user || !profile) return <Splash />;

  if (!profile.email_verified) {
    return <VerifyEmail email={user.email ?? ""} onVerified={() => void refreshProfile(user.id)} />;
  }

  if (profile.banned) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
        <h1 className="text-xl font-semibold">Your account has been suspended</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          A safety review found that this account broke the TeleChat rules. If you think this is a
          mistake, contact LNK Official.
        </p>
        <a
          href="mailto:lnkofficial29@gmail.com?subject=TeleChat%20account%20appeal"
          className="text-sm font-medium text-primary underline"
        >
          Appeal this decision
        </a>
        <button onClick={() => void signOut()} className="text-sm font-medium text-primary">
          Sign out
        </button>
      </div>
    );
  }

  if (!profile.username) {
    return <UsernameSetup userId={user.id} onDone={() => refreshProfile(user.id)} />;
  }

  const activeMessages = active ? (chat.byPeer.get(active.id) ?? []) : [];

  const startCall = async (video: boolean) => {
    if (!active?.peer_id) return;
    try {
      await call.startCall(active.peer_id, video);
      push.push(
        active.id,
        `${profile.display_name ?? profile.username}`,
        video ? "Incoming video call" : "Incoming voice call",
        true,
      );
    } catch {
      toast.error("Camera or microphone permission is required for calls.");
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof MessageCircle }[] = [
    { key: "chats", label: "Chats", icon: MessageCircle },
    { key: "calls", label: "Calls", icon: Phone },
    { key: "contacts", label: "Contacts", icon: Users },
    { key: "account", label: "Account", icon: UserRound },
  ];

  const panelClass = cn(
    "h-full w-full overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+6rem)] md:w-[24rem] md:border-r md:border-sidebar-border md:pb-0",
    active ? "hidden md:block" : "block",
  );

  const sidebar =
    tab === "account" ? (
      <div className={panelClass}>
        <SettingsPanel
          me={profile}
          onOpenProfile={() => setProfileOpen(true)}
          onSignOut={() => void signOut()}
          notifications={notifications}
          onNotifications={(value) => {
            setNotifications(value);
            if (!value) return;
            void push.subscribe().then((ok) => {
              if (ok) toast.success("Alerts on — messages and calls reach you even when closed.");
              else toast.error("Enable notifications in your browser settings.");
            });
          }}
          readReceipts={readReceipts}
          onReadReceipts={setReadReceipts}
        />
      </div>
    ) : tab === "calls" ? (
      <div className={cn(panelClass, "bg-sidebar")}>
        <CallsPanel
          calls={calls}
          onClear={() => {
            clearCalls(user.id);
            setCalls([]);
          }}
          onCallBack={(peerId, video) => {
            const target = contacts.find((c) => c.id === peerId);
            if (!target) return;
            setActiveId(target.id);
            setTab("chats");
            if (target.peer_id) void call.startCall(target.peer_id, video).catch(() => undefined);
          }}
        />
      </div>
    ) : tab === "contacts" ? (
      <div className={cn(panelClass, "bg-sidebar")}>
        <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
          <h1 className="text-lg font-bold">Contacts</h1>
          <button
            onClick={() => setNewChatOpen(true)}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-sidebar-accent"
          >
            Add
          </button>
        </header>
        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActiveId(c.id);
              setTab("chats");
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <Avatar className="size-11">
              <AvatarImage src={c.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{initialsOf(c)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate font-medium">
                <span className="truncate">{c.display_name || c.username}</span>
                {c.verified ? <VerifiedBadge className="size-4" /> : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {chat.onlineIds.includes(c.id) ? "online" : `@${c.username}`}
              </span>
            </span>
          </button>
        ))}
        {contacts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No contacts yet. Tap Add and search a username.
          </p>
        ) : null}
      </div>
    ) : (
      <ChatList
        me={profile}
        contacts={contacts}
        activeId={activeId}
        onlineIds={chat.onlineIds}
        threads={chat.byPeer}
        query={query}
        onQuery={setQuery}
        onSelect={(p) => setActiveId(p.id)}
        onOpenProfile={() => setProfileOpen(true)}
        onNewChat={() => setNewChatOpen(true)}
        className={cn(
          "relative",
          active ? "hidden w-full md:flex md:w-[24rem]" : "flex w-full md:w-[24rem]",
        )}
      />
    );

  return (
    <main className="flex h-[100dvh] overflow-hidden overscroll-none bg-background">
      {sidebar}

      {active ? (
        <ChatWindow
          me={user.id}
          peer={active}
          messages={activeMessages}
          online={chat.onlineIds.includes(active.id)}
          blocked={blocks.blocked.includes(active.id)}
          blockedByPeer={blocks.blockedBy.includes(active.id)}
          onSend={(input) => {
            const sent = chat.send(active.id, input);
            push.push(
              active.id,
              profile.display_name ?? profile.username ?? "New message",
              typeof input === "string" ? input : "Sent an attachment",
            );
            return sent;
          }}
          onDeleteForMe={(m) => void chat.deleteForMe(m)}
          onDeleteForEveryone={(m) => void chat.deleteForEveryone(m)}
          onClear={() => void chat.clearConversation(active.id)}
          onBack={() => setActiveId(null)}
          onCall={(video) => void startCall(video)}
          onReport={() => setReportOpen(true)}
          onToggleBlock={() => {
            if (blocks.blocked.includes(active.id)) {
              void blocks.unblock(active.id);
              toast.success("Unblocked");
            } else {
              void blocks.block(active.id);
              toast.success("Blocked");
            }
          }}
        />
      ) : (
        <section className="hidden flex-1 flex-col items-center justify-center gap-4 bg-chat-canvas px-8 text-center md:flex">
          <div
            className="flex size-16 items-center justify-center rounded-3xl"
            style={{ background: "var(--brand-gradient)", boxShadow: "var(--glow)" }}
          >
            <MessagesSquare className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold">Welcome to TeleChat</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Pick a chat, or add a friend by username. Messages are delivered the moment they come
            back online.
          </p>
        </section>
      )}

      {!active ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden">
          <nav
            className="mx-auto flex max-w-md items-center justify-around rounded-[2rem] border border-sidebar-border/70 bg-sidebar/80 p-1.5 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-panel)" }}
          >
            {tabs.map((t) => {
              const activeTab = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-[1.5rem] px-1 py-2 text-[11px] font-medium transition-all duration-300",
                    activeTab
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.key === "account" ? (
                    <Avatar className="size-5">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[9px]">{initialsOf(profile)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <t.icon className={cn("size-5 transition-transform", activeTab && "scale-110")} />
                  )}
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

      <CallOverlay
        state={call.state}
        peer={active}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        onAnswer={() => void call.answer()}
        onHangUp={call.hangUp}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
        onShareScreen={call.shareScreen}
        sharingScreen={call.sharingScreen}
      />

      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onUpdated={(patch) => setProfile((prev) => (prev ? { ...prev, ...patch } : prev))}
      />
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        ownerId={user.id}
        onAdded={(p) => {
          setContacts((prev) => (prev.some((c) => c.id === p.id) ? prev : [...prev, p]));
          setActiveId(p.id);
          setTab("chats");
        }}
      />
      {active ? (
        <ReportDialog open={reportOpen} onOpenChange={setReportOpen} peer={active} />
      ) : null}

      <PinModal
        open={appLocked}
        mode="unlock"
        correctPin={getSecurityState().pin}
        onSuccess={() => setAppLocked(false)}
        title="TeleChat App Lock"
        description="Enter your PIN to unlock TeleChat"
      />
    </main>
  );
}
