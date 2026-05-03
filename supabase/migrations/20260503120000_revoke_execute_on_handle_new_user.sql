-- Revoke EXECUTE on handle_new_user() from all API-accessible roles.
-- The function is a trigger (RETURNS trigger) and should only be invoked
-- by the database engine on INSERT into auth.users, never via REST API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
