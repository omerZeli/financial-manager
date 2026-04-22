-- Create income_sources table
CREATE TABLE public.income_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('employed', 'self_employed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- Users can view their own income sources
CREATE POLICY "Users can view own income sources"
  ON public.income_sources
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own income sources
CREATE POLICY "Users can insert own income sources"
  ON public.income_sources
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own income sources
CREATE POLICY "Users can update own income sources"
  ON public.income_sources
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own income sources
CREATE POLICY "Users can delete own income sources"
  ON public.income_sources
  FOR DELETE
  USING (auth.uid() = user_id);
