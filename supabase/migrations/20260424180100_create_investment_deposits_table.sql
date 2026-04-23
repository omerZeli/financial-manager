CREATE TABLE public.investment_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.investment_channels(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.investment_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own investment deposits"
  ON public.investment_deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment deposits"
  ON public.investment_deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment deposits"
  ON public.investment_deposits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment deposits"
  ON public.investment_deposits FOR DELETE
  USING (auth.uid() = user_id);
