export type ChatMessage = {
  id: string;
  text: string;
  mine: boolean;
  ts: number;
  status: "pending" | "sent" | "received";
};

const key = (ownerId: string, peerId: string) => `telechat:v1:${ownerId}:${peerId}`;

export function loadMessages(ownerId: string, peerId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(ownerId, peerId));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveMessages(ownerId: string, peerId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(ownerId, peerId), JSON.stringify(messages.slice(-500)));
}

export function clearMessages(ownerId: string, peerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(ownerId, peerId));
}

export function lastMessage(ownerId: string, peerId: string): ChatMessage | null {
  const all = loadMessages(ownerId, peerId);
  return all.length ? all[all.length - 1]! : null;
}