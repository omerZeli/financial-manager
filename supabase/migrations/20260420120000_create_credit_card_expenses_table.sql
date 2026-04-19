-- Create credit card expenses table
CREATE TABLE public.credit_card_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  expense_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_card_expenses ENABLE ROW LEVEL SECURITY;

-- Users can view their own expenses
CREATE POLICY "Users can view own expenses"
  ON public.credit_card_expenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own expenses
CREATE POLICY "Users can insert own expenses"
  ON public.credit_card_expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own expenses
CREATE POLICY "Users can update own expenses"
  ON public.credit_card_expenses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own expenses
CREATE POLICY "Users can delete own expenses"
  ON public.credit_card_expenses
  FOR DELETE
  USING (auth.uid() = user_id);
