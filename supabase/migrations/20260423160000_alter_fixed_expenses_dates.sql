ALTER TABLE public.fixed_expenses DROP COLUMN day_of_month;
ALTER TABLE public.fixed_expenses ADD COLUMN start_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.fixed_expenses ADD COLUMN end_date DATE;
ALTER TABLE public.fixed_expenses ALTER COLUMN start_date DROP DEFAULT;
