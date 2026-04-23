CREATE TABLE public.paybacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('by_me', 'to_me')),
  -- Fields for "by_me" (I paid someone back)
  name TEXT,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  person TEXT NOT NULL,
  -- Field for "to_me" (someone paid me back for an existing expense)
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.paybacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own paybacks"
  ON public.paybacks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paybacks"
  ON public.paybacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own paybacks"
  ON public.paybacks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own paybacks"
  ON public.paybacks FOR DELETE
  USING (auth.uid() = user_id);
