import { createServerFn } from "@tanstack/react-start";

/** Emails a 6-digit password reset code. Always reports success to avoid leaking accounts. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email");
    return { email };
  })
  .handler(async ({ data }) => {
    const { findUserByEmail, issueOtp, sendOtpEmail } = await import("./reset.server");
    const user = await findUserByEmail(data.email);
    if (!user) return { sent: true as const };
    const code = await issueOtp(data.email, "reset");
    await sendOtpEmail(data.email, code, `${code} is your TeleChat password reset code`);
    return { sent: true as const };
  });

/** Verifies the reset code and sets a new password. */
export const resetPasswordWithOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; password: string }) => {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();
    const code = String(input.code ?? "").trim();
    const password = String(input.password ?? "");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email");
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6-digit code");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    return { email, code, password };
  })
  .handler(async ({ data }) => {
    const { findUserByEmail, consumeOtp } = await import("./reset.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const user = await findUserByEmail(data.email);
    if (!user) throw new Error("No active code. Request a new one.");
    await consumeOtp(data.email, "reset", data.code);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { reset: true as const };
  });
