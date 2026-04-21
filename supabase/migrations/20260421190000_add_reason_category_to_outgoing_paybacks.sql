ALTER TABLE public.outgoing_paybacks
  ADD COLUMN reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN category TEXT NOT NULL DEFAULT '';
