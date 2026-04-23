-- Drop tables in dependency order (children first)
DROP TABLE IF EXISTS public.fixed_expenses CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.salaries CASCADE;
DROP TABLE IF EXISTS public.user_dropdown_options CASCADE;
DROP TABLE IF EXISTS public.credit_cards CASCADE;
DROP TABLE IF EXISTS public.income_sources CASCADE;
