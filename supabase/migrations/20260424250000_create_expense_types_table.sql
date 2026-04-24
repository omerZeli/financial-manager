CREATE TABLE public.expense_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_name TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, type_name)
);

ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expense types"
  ON public.expense_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expense types"
  ON public.expense_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expense types"
  ON public.expense_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expense types"
  ON public.expense_types FOR DELETE
  USING (auth.uid() = user_id);
