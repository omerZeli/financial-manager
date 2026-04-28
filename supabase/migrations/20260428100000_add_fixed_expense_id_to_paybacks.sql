-- Add fixed_expense_id column to paybacks for "to_me" paybacks linked to fixed expenses
ALTER TABLE public.paybacks
  ADD COLUMN fixed_expense_id UUID REFERENCES public.fixed_expenses(id) ON DELETE CASCADE;
