import { supabase } from "@/integrations/supabase/client";

/** Uploads a chat attachment and returns a long-lived signed URL. */
export async function uploadChatMedia(userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !data) throw signError ?? new Error("Could not prepare the file");
  return data.signedUrl;
}