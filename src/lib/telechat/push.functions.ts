import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public VAPID key so the browser can create a push subscription. */
export const getVapidKey = createServerFn({ method: "GET" }).handler(async () => ({
  key: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

/** Stores this device so alerts arrive even when TeleChat is closed. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string; p256dh: string; auth: string }) => ({
    endpoint: String(input.endpoint),
    p256dh: String(input.p256dh),
    auth: String(input.auth),
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** Delivers a chat or call alert to every device the recipient registered. */
export const sendPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { to: string; title: string; body: string; call?: boolean }) => ({
    to: String(input.to),
    title: String(input.title).slice(0, 80),
    body: String(input.body).slice(0, 160),
    call: Boolean(input.call),
  }))
  .handler(async ({ data }) => {
    const vapid = {
      subject: process.env["VAPID_SUBJECT"] ?? "mailto:support@telechat.app",
      publicKey: process.env["VAPID_PUBLIC_KEY"],
      privateKey: process.env["VAPID_PRIVATE_KEY"],
    };
    if (!vapid.publicKey || !vapid.privateKey) return { sent: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", data.to);

    const rows = (subs as { endpoint: string; p256dh: string; auth: string }[] | null) ?? [];
    if (rows.length === 0) return { sent: 0 };

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    let sent = 0;

    await Promise.all(
      rows.map(async (row) => {
        const subscription = {
          endpoint: row.endpoint,
          expirationTime: null,
          keys: { p256dh: row.p256dh, auth: row.auth },
        };
        try {
          const payload = await buildPushPayload(
            {
              data: {
                title: data.title,
                body: data.body,
                url: "/",
                call: data.call,
                tag: data.call ? "telechat-call" : "telechat-message",
              },
              options: { ttl: data.call ? 60 : 86400, urgency: data.call ? "high" : "normal" },
            },
            subscription,
            vapid,
          );
          const res = await fetch(row.endpoint, {
            method: payload.method,
            headers: payload.headers as unknown as HeadersInit,
            body: new Uint8Array(payload.body) as unknown as BodyInit,
          });
          if (res.ok) sent += 1;
          if (res.status === 404 || res.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
        } catch (err) {
          console.error("push failed", err);
        }
      }),
    );

    return { sent };
  });
