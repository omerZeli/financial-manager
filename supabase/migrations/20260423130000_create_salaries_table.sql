CREATE TABLE public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  bruto NUMERIC(12,2) NOT NULL,
  neto NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- Users can view their own salaries
CREATE POLICY "Users can view own salaries"
  ON public.salaries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own salaries
CREATE POLICY "Users can insert own salaries"
  ON public.salaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own salaries
CREATE POLICY "Users can update own salaries"
  ON public.salaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own salaries
CREATE POLICY "Users can delete own salaries"
  ON public.salaries FOR DELETE
  USING (auth.uid() = user_id);
