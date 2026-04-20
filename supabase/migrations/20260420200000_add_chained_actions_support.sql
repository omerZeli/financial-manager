-- Add requires_payback field to credit_card_expenses
ALTER TABLE public.credit_card_expenses
  ADD COLUMN requires_payback BOOLEAN NOT NULL DEFAULT false;

-- Add triggered_by column to action_logs to link chained actions
ALTER TABLE public.action_logs
  ADD COLUMN triggered_by UUID REFERENCES public.action_logs(id) ON DELETE SET NULL;
