import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  kind: string;
  media_url: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  deleted_for_all: boolean;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;
};

const COLUMNS =
  "id, sender_id, recipient_id, body, kind, media_url, created_at, delivered_at, read_at, deleted_for_all, deleted_by_sender, deleted_by_recipient";

/**
 * Device storage is the source of truth. The server is only a relay: a message
 * lives there until the recipient's device picks it up, then it is deleted.
 */
const cacheKey = (userId: string) => `telechat:cache:v1:${userId}`;

function readCache(userId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string, messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(userId), JSON.stringify(messages.slice(-2000)));
  } catch {
    /* quota exceeded — cache is best effort */
  }
}

export function useChat(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>(() => []);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const upsert = useCallback((row: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === row.id);
      if (idx === -1) return [...prev, row].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const next = [...prev];
      next[idx] = { ...next[idx]!, ...row };
      return next;
    });
  }, []);

  /** Confirm receipt to the sender, then wipe the row from the server. */
  const claim = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("messages").update({ delivered_at: now }).eq("id", id);
    window.setTimeout(() => {
      void supabase.from("messages").delete().eq("id", id);
    }, 1500);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Instant boot from device cache.
    const cached = readCache(userId);
    setMessages(cached);
    setLoading(false);

    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select(COLUMNS)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: true })
        .limit(2000);
      if (cancelled) return;
      const rows = (data as Message[] | null) ?? [];
      rows.forEach((row) => upsert(row));
      for (const row of rows) {
        if (row.recipient_id === userId) void claim(row.id);
      }
    })();

    const channel = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Message;
          if (!row?.id) return;
          upsert(row);
          void claim(row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` },
        (payload) => {
          // Deletions on the server mean "delivered" — keep the local copy.
          const row = payload.new as Message;
          if (row?.id) upsert(row);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, upsert, claim]);

  // Keep the device cache warm.
  useEffect(() => {
    if (!userId) return;
    const id = window.setTimeout(() => writeCache(userId, messages), 300);
    return () => window.clearTimeout(id);
  }, [messages, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("telechat-presence", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(Object.keys(channel.presenceState()));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const send = useCallback(
    async (recipientId: string, input: { body: string; kind?: string; mediaUrl?: string | null }) => {
      const me = userIdRef.current;
      if (!me) return;
      const optimistic: Message = {
        id: crypto.randomUUID(),
        sender_id: me,
        recipient_id: recipientId,
        body: input.body,
        kind: input.kind ?? "text",
        media_url: input.mediaUrl ?? null,
        created_at: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        deleted_for_all: false,
        deleted_by_sender: false,
        deleted_by_recipient: false,
      };
      upsert(optimistic);

      const { error } = await supabase.from("messages").insert({
        id: optimistic.id,
        sender_id: me,
        recipient_id: recipientId,
        body: optimistic.body,
        kind: optimistic.kind,
        media_url: optimistic.media_url,
      });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        throw error;
      }
    },
    [upsert],
  );

  const markRead = useCallback(async (peerId: string) => {
    const me = userIdRef.current;
    if (!me) return;
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id === peerId && m.recipient_id === me && !m.read_at
          ? { ...m, read_at: now, delivered_at: m.delivered_at ?? now }
          : m,
      ),
    );
    await supabase
      .from("messages")
      .update({ read_at: now, delivered_at: now })
      .eq("recipient_id", me)
      .eq("sender_id", peerId)
      .is("read_at", null);
  }, []);

  const deleteForMe = useCallback(
    async (message: Message) => {
      const me = userIdRef.current;
      if (!me) return;
      const patch =
        message.sender_id === me ? { deleted_by_sender: true } : { deleted_by_recipient: true };
      upsert({ ...message, ...patch });
      await supabase.from("messages").update(patch).eq("id", message.id);
    },
    [upsert],
  );

  const deleteForEveryone = useCallback(
    async (message: Message) => {
      upsert({ ...message, deleted_for_all: true, body: "", media_url: null });
      await supabase
        .from("messages")
        .update({ deleted_for_all: true, body: "", media_url: null })
        .eq("id", message.id);
    },
    [upsert],
  );

  const clearConversation = useCallback(async (peerId: string) => {
    const me = userIdRef.current;
    if (!me) return;
    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            (m.sender_id === peerId && m.recipient_id === me) ||
            (m.sender_id === me && m.recipient_id === peerId)
          ),
      ),
    );
    await supabase
      .from("messages")
      .update({ deleted_by_sender: true })
      .eq("sender_id", me)
      .eq("recipient_id", peerId);
  }, []);

  const byPeer = useMemo(() => {
    const map = new Map<string, Message[]>();
    if (!userId) return map;
    for (const m of messages) {
      const mine = m.sender_id === userId;
      if (mine ? m.deleted_by_sender : m.deleted_by_recipient) continue;
      const peer = mine ? m.recipient_id : m.sender_id;
      const list = map.get(peer) ?? [];
      list.push(m);
      map.set(peer, list);
    }
    return map;
  }, [messages, userId]);

  return {
    messages,
    byPeer,
    onlineIds,
    loading,
    send,
    markRead,
    deleteForMe,
    deleteForEveryone,
    clearConversation,
  };
}
