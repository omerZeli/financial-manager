-- Add payback_id column for "to_me" paybacks that reference a "by_me" payback
ALTER TABLE public.paybacks
  ADD COLUMN payback_id UUID REFERENCES public.paybacks(id) ON DELETE CASCADE;
