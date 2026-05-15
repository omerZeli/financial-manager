-- Fix UPDATE policies: add WITH CHECK clause to prevent user_id reassignment
-- This closes the vulnerability where a user could transfer record ownership
-- by changing the user_id field in an UPDATE.

-- profiles (uses 'id' instead of 'user_id')
ALTER POLICY "Users can update own profile" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- salaries
ALTER POLICY "Users can update own salaries" ON salaries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- expenses
ALTER POLICY "Users can update own expenses" ON expenses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- fixed_expenses
ALTER POLICY "Users can update own fixed expenses" ON fixed_expenses
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- paybacks
ALTER POLICY "Users can update own paybacks" ON paybacks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- investment_channels
ALTER POLICY "Users can update own investment channels" ON investment_channels
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- investment_deposits
ALTER POLICY "Users can update own investment deposits" ON investment_deposits
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- investment_value_updates
ALTER POLICY "Users can update own investment value updates" ON investment_value_updates
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- expense_types
ALTER POLICY "Users can update own expense types" ON expense_types
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_dropdown_options: no UPDATE policy existed at all — create one
CREATE POLICY "Users can update own dropdown options" ON user_dropdown_options
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
