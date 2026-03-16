-- Fix: remove the overly-permissive "service role full access" policy.
-- The service_role already bypasses RLS in Supabase, so no explicit policy
-- is needed. Only authenticated users reading their own row should be allowed.

DROP POLICY IF EXISTS "service role full access" ON public.user_roles;
