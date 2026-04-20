CREATE POLICY "Users can delete own action_logs"
  ON public.action_logs
  FOR DELETE
  USING (auth.uid() = user_id);
