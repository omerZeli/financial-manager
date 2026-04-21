-- Create fixed expenses table
CREATE TABLE public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  start_date DATE NOT NULL,
  frequency_value INTEGER NOT NULL,
  frequency_unit TEXT NOT NULL CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years')),
  has_end_date BOOLEAN NOT NULL DEFAULT false,
  end_date DATE,
  amount NUMERIC(12, 2) NOT NULL,
  source_action_type TEXT,          -- e.g. 'insurance', 'rent' — which action created this fixed expense
  source_reference_id UUID,         -- FK to the originating record in another table
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own fixed expenses
CREATE POLICY "Users can view own fixed_expenses"
  ON public.fixed_expenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own fixed expenses
CREATE POLICY "Users can insert own fixed_expenses"
  ON public.fixed_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own fixed expenses
CREATE POLICY "Users can update own fixed_expenses"
  ON public.fixed_expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own fixed expenses
CREATE POLICY "Users can delete own fixed_expenses"
  ON public.fixed_expenses
  FOR DELETE
  USING (auth.uid() = user_id);
