ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'offline';

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'text',
  media_url text,
  reply_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  edited_at timestamptz,
  deleted_for_all boolean NOT NULL DEFAULT false,
  deleted_by_sender boolean NOT NULL DEFAULT false,
  deleted_by_recipient boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read their messages" ON public.messages;
CREATE POLICY "Participants can read their messages"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

DROP POLICY IF EXISTS "Participants can update their messages" ON public.messages;
CREATE POLICY "Participants can update their messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Senders can delete their messages" ON public.messages;
CREATE POLICY "Senders can delete their messages"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS messages_pair_idx ON public.messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages (recipient_id, created_at DESC);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'signup',
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.email_otps TO service_role;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_otps_email_idx ON public.email_otps (email, created_at DESC);