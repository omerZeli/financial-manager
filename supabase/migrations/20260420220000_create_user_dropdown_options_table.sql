-- Create user_dropdown_options table for user-managed dropdown options
CREATE TABLE public.user_dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- e.g. 'payback_method', 'expense_category'
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, category, label)
);

-- Enable RLS
ALTER TABLE public.user_dropdown_options ENABLE ROW LEVEL SECURITY;

-- Users can view their own options
CREATE POLICY "Users can view own dropdown_options"
  ON public.user_dropdown_options
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own options
CREATE POLICY "Users can insert own dropdown_options"
  ON public.user_dropdown_options
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own options
CREATE POLICY "Users can delete own dropdown_options"
  ON public.user_dropdown_options
  FOR DELETE
  USING (auth.uid() = user_id);
