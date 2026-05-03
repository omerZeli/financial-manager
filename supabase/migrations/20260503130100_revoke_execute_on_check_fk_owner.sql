-- The check_fk_owner function is only meant to be called by triggers, not directly via the API.
-- Revoke EXECUTE from anon and authenticated roles to prevent direct invocation.
REVOKE EXECUTE ON FUNCTION public.check_fk_owner() FROM anon, authenticated, public;
