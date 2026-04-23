CREATE TABLE public.investment_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  investment_path TEXT NOT NULL,
  is_pension BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.investment_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment channels"
  ON public.investment_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment channels"
  ON public.investment_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment channels"
  ON public.investment_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment channels"
  ON public.investment_channels FOR DELETE
  USING (auth.uid() = user_id);
