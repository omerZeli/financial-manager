CREATE TABLE public.investment_value_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.investment_channels(id) ON DELETE CASCADE,
  value NUMERIC(14,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.investment_value_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment value updates"
  ON public.investment_value_updates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment value updates"
  ON public.investment_value_updates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment value updates"
  ON public.investment_value_updates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment value updates"
  ON public.investment_value_updates FOR DELETE
  USING (auth.uid() = user_id);
