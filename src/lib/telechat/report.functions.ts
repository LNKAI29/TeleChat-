import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the last 25 messages of the chat to LNK Official for AI review.
 * The reported account is only banned when the review finds a real violation.
 */
export const reportToTeleChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportedId: string; reason: string }) => {
    const reportedId = String(input.reportedId ?? "").trim();
    const reason = String(input.reason ?? "").trim().slice(0, 500);
    if (!/^[0-9a-f-]{36}$/i.test(reportedId)) throw new Error("Pick a valid contact to report");
    return { reportedId, reason };
  })
  .handler(async ({ data, context }) => {
    if (data.reportedId === context.userId) throw new Error("You cannot report yourself");
    const { lastMessages, reviewTranscript, saveReport } = await import("./report.server");

    const transcript = await lastMessages(context.userId, data.reportedId);
    const verdict = await reviewTranscript(transcript, data.reason);
    const banned = await saveReport({
      reporterId: context.userId,
      reportedId: data.reportedId,
      reason: data.reason,
      transcript,
      verdict,
    });

    return { reviewed: transcript.length, banned, summary: verdict.summary };
  });