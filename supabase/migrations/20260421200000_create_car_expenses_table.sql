-- Create car expenses table
CREATE TABLE public.car_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  start_date DATE,
  frequency_value INTEGER,
  frequency_unit TEXT CHECK (frequency_unit IN ('days', 'weeks', 'months', 'years')),
  has_end_date BOOLEAN NOT NULL DEFAULT false,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.car_expenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own car expenses
CREATE POLICY "Users can view own car_expenses"
  ON public.car_expenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own car expenses
CREATE POLICY "Users can insert own car_expenses"
  ON public.car_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own car expenses
CREATE POLICY "Users can update own car_expenses"
  ON public.car_expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own car expenses
CREATE POLICY "Users can delete own car_expenses"
  ON public.car_expenses
  FOR DELETE
  USING (auth.uid() = user_id);
