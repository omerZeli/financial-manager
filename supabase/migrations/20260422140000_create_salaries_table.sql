-- Create salaries table
CREATE TABLE public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  income_source_id UUID NOT NULL REFERENCES public.income_sources(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  gross INTEGER NOT NULL,
  net INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Unique constraint: one salary per source per month
ALTER TABLE public.salaries ADD CONSTRAINT salaries_source_month_unique UNIQUE (income_source_id, month);

-- Enable RLS
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own salaries"
  ON public.salaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own salaries"
  ON public.salaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own salaries"
  ON public.salaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own salaries"
  ON public.salaries FOR DELETE
  USING (auth.uid() = user_id);
