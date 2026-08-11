import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildOtpEmail } from "./otp-email";

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function findUserByEmail(email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

export async function issueOtp(email: string, purpose: string) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("email_otps")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("purpose", purpose)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= 5) throw new Error("Too many codes requested. Try again later.");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { error } = await supabaseAdmin.from("email_otps").insert({
    email,
    code_hash: await sha256(`${email}:${code}`),
    purpose,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return code;
}

export async function sendOtpEmail(email: string, code: string, subject: string) {
  const apiKey = process.env["BREVO_API_KEY"];
  if (!apiKey) throw new Error("Email service is not configured");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
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
      subject,
      htmlContent: buildOtpEmail(code),
      textContent: `Your TeleChat code is ${code}. It expires in 10 minutes.`,
    }),
  });
  if (!response.ok) {
    console.error("Brevo send failed", response.status, await response.text());
    throw new Error("Could not send the email. Please try again.");
  }
}

export async function consumeOtp(email: string, purpose: string, code: string) {
  const { data: row } = await supabaseAdmin
    .from("email_otps")
    .select("id, code_hash, expires_at, attempts, consumed_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) throw new Error("No active code. Request a new one.");
  if (new Date(row.expires_at).getTime() < Date.now())
    throw new Error("This code expired. Request a new one.");
  if (row.attempts >= 5) throw new Error("Too many attempts. Request a new code.");

  if ((await sha256(`${email}:${code}`)) !== row.code_hash) {
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
}
