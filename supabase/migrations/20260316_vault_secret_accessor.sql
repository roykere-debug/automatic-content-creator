-- Creates a public helper function that reads decrypted secrets from Supabase Vault.
-- Edge functions call this via supabase.rpc('get_vault_secret') since PostgREST
-- does not expose the vault schema directly.
--
-- SECURITY DEFINER ensures the function runs with the privileges of the owner
-- (postgres / service role) so it can always access vault.decrypted_secrets.

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret
    INTO secret_value
    FROM vault.decrypted_secrets
   WHERE name = secret_name
   LIMIT 1;

  RETURN secret_value;
END;
$$;

-- Only the service role should call this
REVOKE ALL ON FUNCTION public.get_vault_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vault_secret(TEXT) TO service_role;
