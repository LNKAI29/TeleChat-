ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

UPDATE public.profiles p SET verified = true
WHERE p.id IN (SELECT u.id FROM auth.users u WHERE lower(u.email) IN ('lakindunimsaralnk@gmail.com','lnkofficial29@gmail.com'));

CREATE TABLE IF NOT EXISTS public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocks involving them" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = owner_id OR auth.uid() = blocked_id);
CREATE POLICY "Users can block others" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND owner_id <> blocked_id);
CREATE POLICY "Users can unblock" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Recipients can delete delivered messages" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = recipient_id);