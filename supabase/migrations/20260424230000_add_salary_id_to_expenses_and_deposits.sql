ALTER TABLE public.expenses ADD COLUMN salary_id UUID REFERENCES public.salaries(id) ON DELETE SET NULL;
ALTER TABLE public.fixed_expenses ADD COLUMN salary_id UUID REFERENCES public.salaries(id) ON DELETE SET NULL;
ALTER TABLE public.investment_deposits ADD COLUMN salary_id UUID REFERENCES public.salaries(id) ON DELETE SET NULL;
