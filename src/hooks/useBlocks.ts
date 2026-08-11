import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** People I blocked, plus people who blocked me. */
export function useBlocks(userId: string | null) {
  const [blocked, setBlocked] = useState<string[]>([]);
  const [blockedBy, setBlockedBy] = useState<string[]>([]);

  const refresh = useCallback(async (id: string) => {
    const { data } = await supabase.from("blocks").select("owner_id, blocked_id");
    const rows = (data as { owner_id: string; blocked_id: string }[] | null) ?? [];
    setBlocked(rows.filter((r) => r.owner_id === id).map((r) => r.blocked_id));
    setBlockedBy(rows.filter((r) => r.blocked_id === id).map((r) => r.owner_id));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refresh(userId);
  }, [userId, refresh]);

  const block = useCallback(
    async (peerId: string) => {
      if (!userId) return;
      setBlocked((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
      await supabase.from("blocks").insert({ owner_id: userId, blocked_id: peerId });
    },
    [userId],
  );

  const unblock = useCallback(
    async (peerId: string) => {
      if (!userId) return;
      setBlocked((prev) => prev.filter((id) => id !== peerId));
      await supabase.from("blocks").delete().eq("owner_id", userId).eq("blocked_id", peerId);
    },
    [userId],
  );

  return { blocked, blockedBy, block, unblock };
}
