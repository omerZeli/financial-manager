-- Create paybacks table
CREATE TABLE public.paybacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debtor_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payback_method TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.paybacks ENABLE ROW LEVEL SECURITY;

-- Users can view their own paybacks
CREATE POLICY "Users can view own paybacks"
  ON public.paybacks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own paybacks
CREATE POLICY "Users can insert own paybacks"
  ON public.paybacks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own paybacks
CREATE POLICY "Users can update own paybacks"
  ON public.paybacks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own paybacks
CREATE POLICY "Users can delete own paybacks"
  ON public.paybacks
  FOR DELETE
  USING (auth.uid() = user_id);
