-- Create user_dropdown_options table
CREATE TABLE public.user_dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, category, label)
);

-- Enable RLS
ALTER TABLE public.user_dropdown_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dropdown options"
  ON public.user_dropdown_options FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dropdown options"
  ON public.user_dropdown_options FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dropdown options"
  ON public.user_dropdown_options FOR DELETE
  USING (auth.uid() = user_id);
