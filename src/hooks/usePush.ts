import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { getVapidKey, savePushSubscription, sendPush } from "@/lib/telechat/push.functions";

const b64ToBytes = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const bufToB64 = (buf: ArrayBuffer | null) =>
  buf ? window.btoa(String.fromCharCode(...new Uint8Array(buf))) : "";

/**
 * Registers this device for background alerts so messages and calls arrive
 * even when the TeleChat tab is closed.
 */
export function usePush(userId: string | null, enabled: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const saveSub = useServerFn(savePushSubscription);
  const readKey = useServerFn(getVapidKey);
  const notify = useServerFn(sendPush);
  const registered = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return false;

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const { key } = await readKey({});
    if (!key) return false;

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToBytes(key),
      }));

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    await saveSub({
      data: {
        endpoint: json.endpoint ?? sub.endpoint,
        p256dh: json.keys?.p256dh ?? bufToB64(sub.getKey("p256dh")),
        auth: json.keys?.auth ?? bufToB64(sub.getKey("auth")),
      },
    });
    return true;
  }, [readKey, saveSub]);

  // Re-register silently on every load once the user has allowed alerts.
  useEffect(() => {
    if (!userId || !enabled || registered.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    registered.current = true;
    void subscribe().catch(() => undefined);
  }, [userId, enabled, subscribe]);

  const push = useCallback(
    (to: string, title: string, body: string, call = false) => {
      void notify({ data: { to, title, body, call } }).catch(() => undefined);
    },
    [notify],
  );

  return { permission, subscribe, push };
}
