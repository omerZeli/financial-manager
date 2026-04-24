ALTER TABLE public.fixed_expenses DROP COLUMN salary_id;
ALTER TABLE public.fixed_expenses ADD COLUMN salary_employer TEXT;
