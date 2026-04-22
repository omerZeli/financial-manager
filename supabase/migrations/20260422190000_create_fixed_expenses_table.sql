-- Create fixed_expenses table
CREATE TABLE public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  start_date DATE NOT NULL,
  frequency_value INTEGER NOT NULL,
  frequency_period TEXT NOT NULL CHECK (frequency_period IN ('days', 'weeks', 'months', 'years')),
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed expenses"
  ON public.fixed_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed expenses"
  ON public.fixed_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed expenses"
  ON public.fixed_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed expenses"
  ON public.fixed_expenses FOR DELETE
  USING (auth.uid() = user_id);
