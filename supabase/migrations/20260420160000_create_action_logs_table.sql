-- Create action_logs table to track all user actions with open/closed status
CREATE TABLE public.action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,        -- e.g. 'credit_card_expense', 'payback'
  action_label TEXT NOT NULL,       -- Hebrew display label
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  reference_id UUID,                -- optional FK to the actual record
  summary TEXT NOT NULL,            -- short description of what was saved
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own action logs
CREATE POLICY "Users can view own action_logs"
  ON public.action_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own action logs
CREATE POLICY "Users can insert own action_logs"
  ON public.action_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own action logs (for closing open actions)
CREATE POLICY "Users can update own action_logs"
  ON public.action_logs
  FOR UPDATE
  USING (auth.uid() = user_id);
