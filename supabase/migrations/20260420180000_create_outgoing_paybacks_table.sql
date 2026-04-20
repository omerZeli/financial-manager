-- Create outgoing_paybacks table
CREATE TABLE public.outgoing_paybacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payback_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.outgoing_paybacks ENABLE ROW LEVEL SECURITY;

-- Users can view their own outgoing paybacks
CREATE POLICY "Users can view own outgoing_paybacks"
  ON public.outgoing_paybacks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own outgoing paybacks
CREATE POLICY "Users can insert own outgoing_paybacks"
  ON public.outgoing_paybacks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own outgoing paybacks
CREATE POLICY "Users can update own outgoing_paybacks"
  ON public.outgoing_paybacks
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own outgoing paybacks
CREATE POLICY "Users can delete own outgoing_paybacks"
  ON public.outgoing_paybacks
  FOR DELETE
  USING (auth.uid() = user_id);
