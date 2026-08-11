ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ban_reason text;

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  verdict text NOT NULL DEFAULT 'pending',
  ai_summary text,
  action_taken text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters can view their own reports" ON public.reports;
CREATE POLICY "Reporters can view their own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

CREATE INDEX IF NOT EXISTS reports_reported_idx ON public.reports (reported_id);