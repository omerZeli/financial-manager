CREATE TABLE public.insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  first_charge_date DATE NOT NULL,
  monthly_payment NUMERIC(12, 2) NOT NULL,
  has_end_date BOOLEAN NOT NULL DEFAULT false,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.insurances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insurances"
  ON public.insurances FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insurances"
  ON public.insurances FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insurances"
  ON public.insurances FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insurances"
  ON public.insurances FOR DELETE USING (auth.uid() = user_id);
