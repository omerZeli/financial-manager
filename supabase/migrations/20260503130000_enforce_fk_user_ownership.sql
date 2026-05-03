-- Enforce that cross-table FK references belong to the same user (auth.uid()).
-- This prevents a user from inserting a row that references another user's record
-- via a known/guessed UUID, closing the information-disclosure gap left by FK + RLS alone.

-- Generic helper: given a target table and column, verify the referenced row's user_id
-- matches the inserting user's auth.uid(). Nullable FKs are allowed (NULL skips the check).
CREATE OR REPLACE FUNCTION public.check_fk_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _fk_column TEXT   := TG_ARGV[0];   -- column on the NEW row holding the FK value
  _ref_table TEXT   := TG_ARGV[1];   -- referenced table name (schema-qualified if needed)
  _fk_value  UUID;
  _owner     UUID;
BEGIN
  -- Read the FK value dynamically
  EXECUTE format('SELECT ($1).%I', _fk_column) INTO _fk_value USING NEW;

  -- NULL FK means no link — nothing to validate
  IF _fk_value IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the owner of the referenced row
  EXECUTE format('SELECT user_id FROM %s WHERE id = $1', _ref_table)
    INTO _owner USING _fk_value;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Referenced % row does not exist', _ref_table;
  END IF;

  IF _owner <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot reference a % row that belongs to another user', _ref_table;
  END IF;

  RETURN NEW;
END;
$$;

-- 1. paybacks.expense_id → expenses
CREATE TRIGGER trg_paybacks_check_expense_owner
  BEFORE INSERT OR UPDATE ON public.paybacks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('expense_id', 'public.expenses');

-- 2. paybacks.fixed_expense_id → fixed_expenses
CREATE TRIGGER trg_paybacks_check_fixed_expense_owner
  BEFORE INSERT OR UPDATE ON public.paybacks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('fixed_expense_id', 'public.fixed_expenses');

-- 3. investment_deposits.channel_id → investment_channels
CREATE TRIGGER trg_investment_deposits_check_channel_owner
  BEFORE INSERT OR UPDATE ON public.investment_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('channel_id', 'public.investment_channels');

-- 4. investment_value_updates.channel_id → investment_channels
CREATE TRIGGER trg_investment_value_updates_check_channel_owner
  BEFORE INSERT OR UPDATE ON public.investment_value_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('channel_id', 'public.investment_channels');

-- 5. expenses.salary_id → salaries
CREATE TRIGGER trg_expenses_check_salary_owner
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('salary_id', 'public.salaries');

-- 6. investment_deposits.salary_id → salaries
CREATE TRIGGER trg_investment_deposits_check_salary_owner
  BEFORE INSERT OR UPDATE ON public.investment_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.check_fk_owner('salary_id', 'public.salaries');
