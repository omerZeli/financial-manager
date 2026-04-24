-- Change paybacks.expense_id FK from ON DELETE SET NULL to ON DELETE CASCADE
ALTER TABLE public.paybacks
  DROP CONSTRAINT IF EXISTS paybacks_expense_id_fkey;

ALTER TABLE public.paybacks
  ADD CONSTRAINT paybacks_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;
