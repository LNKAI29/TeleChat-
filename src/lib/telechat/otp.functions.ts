import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { buildOtpEmail } from "./otp-email";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Sends a 6-digit verification code to the signed-in user's email via Brevo. */
export const requestEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("No email on this account");

    const apiKey = process.env["BREVO_API_KEY"];
    if (!apiKey) throw new Error("Email service is not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Basic throttle: max 5 codes per email per hour.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("email_otps")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", hourAgo);
    if ((count ?? 0) >= 5) throw new Error("Too many codes requested. Try again later.");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(`${email}:${code}`);

    const { error } = await supabaseAdmin.from("email_otps").insert({
      email,
      code_hash,
      purpose: "signup",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TeleChat", email: "telechat@lnk.abrdns.com" },
        replyTo: { name: "TeleChat Support", email: "telechat@lnk.abrdns.com" },
        headers: {
          "X-Entity-Ref-ID": crypto.randomUUID(),
          "List-Unsubscribe": "<mailto:telechat@lnk.abrdns.com?subject=unsubscribe>",
          Precedence: "transactional",
        },
        tags: ["telechat-otp"],
        to: [{ email }],
        subject: `${code} is your TeleChat verification code`,
        htmlContent: buildOtpEmail(code),
        textContent: `Your TeleChat verification code is ${code}. It expires in 10 minutes.`,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Brevo send failed", response.status, detail);
      throw new Error("Could not send the verification email. Please try again.");
    }

    return { sent: true as const };
  });

/** Checks the code and marks the profile as email-verified. */
export const verifyEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    const code = String(input.code ?? "").trim();
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code");
    return { code };
  })
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email;
    if (!email) throw new Error("No email on this account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("email_otps")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("email", email)
      .eq("purpose", "signup")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("No active code. Request a new one.");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("This code expired. Request a new one.");
    if (row.attempts >= 5) throw new Error("Too many attempts. Request a new code.");

    const hash = await sha256(`${email}:${data.code}`);
    if (hash !== row.code_hash) {
      await supabaseAdmin
        .from("email_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("That code is incorrect.");
    }

    await supabaseAdmin
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);

    return { verified: true as const };
  });