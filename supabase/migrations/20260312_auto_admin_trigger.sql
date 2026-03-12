-- =============================================
-- AutoPilot Content — Auto-Admin Setup
-- Ensures:
--   1. A Postgres trigger automatically inserts any new signup into
--      user_roles as 'admin' (single-tenant personal tool).
--   2. Any already-existing auth users that don't have a role get one.
--   3. RLS on user_roles allows users to read their own role so the
--      frontend checkAdminRole() call succeeds.
-- =============================================

-- 1. Trigger function: insert new auth.user into user_roles as admin
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to auth.users (fires after every INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin();

-- 3. Backfill: give any existing auth user without a role an admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. RLS: allow users to SELECT their own role (frontend checkAdminRole needs this)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own role" ON public.user_roles;
CREATE POLICY "users can read own role"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service role full access" ON public.user_roles;
CREATE POLICY "service role full access"
  ON public.user_roles
  USING (true)
  WITH CHECK (true);
