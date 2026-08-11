import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type TranscriptLine = { from: "reported" | "reporter"; text: string; at: string };

/** Last 25 messages exchanged between the two people, oldest first. */
export async function lastMessages(reporterId: string, reportedId: string) {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("sender_id, body, kind, created_at")
    .or(
      `and(sender_id.eq.${reporterId},recipient_id.eq.${reportedId}),and(sender_id.eq.${reportedId},recipient_id.eq.${reporterId})`,
    )
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(error.message);

  return ((data ?? []) as { sender_id: string; body: string; kind: string; created_at: string }[])
    .reverse()
    .map<TranscriptLine>((m) => ({
      from: m.sender_id === reportedId ? "reported" : "reporter",
      text: m.kind === "text" || m.kind === "sticker" ? m.body : `[${m.kind} attachment]`,
      at: m.created_at,
    }));
}

type Verdict = { violation: boolean; summary: string; category: string };

/** Reviews the transcript with Lovable AI. Only clear abuse counts as a violation. */
export async function reviewTranscript(
  transcript: TranscriptLine[],
  reason: string,
): Promise<Verdict> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Review service is unavailable right now.");
  if (transcript.length === 0) {
    return { violation: false, summary: "No messages were available to review.", category: "none" };
  }

  const body = {
    model: "google/gemini-3.6-flash",
    messages: [
      {
        role: "system",
        content:
          "You are the TeleChat safety reviewer for LNK Official. You read the last messages of a private chat and decide if the REPORTED person clearly broke the rules: harassment, threats, hate speech, sexual content involving minors, scams/fraud, spam, or sharing someone's private data. Only messages written by the reported person matter. Be strict about false reports: if there is no clear evidence of abuse, violation MUST be false. Reply with JSON only: {\"violation\": boolean, \"category\": string, \"summary\": string}. Keep summary under 240 characters.",
      },
      {
        role: "user",
        content: `Report reason: ${reason || "(none given)"}\n\nTranscript (oldest first):\n${transcript
          .map((l) => `${l.from === "reported" ? "REPORTED" : "REPORTER"}: ${l.text}`)
          .join("\n")}`,
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Too many reviews right now. Please try again shortly.");
    if (res.status === 402) throw new Error("The review service is out of credits.");
    throw new Error(`Review failed [${res.status}]: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { violation: false, summary: "Review was inconclusive.", category: "none" };
  try {
    const parsed = JSON.parse(match[0]) as Partial<Verdict>;
    return {
      violation: parsed.violation === true,
      summary: String(parsed.summary ?? "").slice(0, 500),
      category: String(parsed.category ?? "none").slice(0, 60),
    };
  } catch {
    return { violation: false, summary: "Review was inconclusive.", category: "none" };
  }
}

export async function saveReport(input: {
  reporterId: string;
  reportedId: string;
  reason: string;
  transcript: TranscriptLine[];
  verdict: Verdict;
}) {
  const banned = input.verdict.violation;
  await supabaseAdmin.from("reports").insert({
    reporter_id: input.reporterId,
    reported_id: input.reportedId,
    reason: input.reason,
    transcript: input.transcript,
    verdict: banned ? "violation" : "no_violation",
    ai_summary: input.verdict.summary,
    action_taken: banned ? "banned" : "none",
  });

  if (banned) {
    await supabaseAdmin
      .from("profiles")
      .update({ banned: true, ban_reason: input.verdict.category })
      .eq("id", input.reportedId);
  }

  return banned;
}