export type CallLog = {
  id: string;
  peerId: string;
  peerName: string;
  avatar: string | null;
  video: boolean;
  direction: "in" | "out";
  missed: boolean;
  seconds: number;
  at: number;
};

const key = (ownerId: string) => `telechat:calls:v1:${ownerId}`;

export function loadCalls(ownerId: string): CallLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(ownerId));
    return raw ? (JSON.parse(raw) as CallLog[]) : [];
  } catch {
    return [];
  }
}

export function addCall(ownerId: string, log: CallLog): CallLog[] {
  const next = [log, ...loadCalls(ownerId)].slice(0, 200);
  try {
    window.localStorage.setItem(key(ownerId), JSON.stringify(next));
  } catch {
    /* best effort */
  }
  return next;
}

export function clearCalls(ownerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(ownerId));
}
