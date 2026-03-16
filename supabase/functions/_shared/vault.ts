import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Read a secret from Supabase Vault via the public.get_vault_secret() RPC.
 * Falls back to Deno.env.get() for backwards compatibility with secrets
 * set directly as edge function environment variables.
 *
 * The RPC function is defined in migration 20260316_vault_secret_accessor.sql
 * and uses SECURITY DEFINER to read from vault.decrypted_secrets.
 */
export async function getVaultSecret(
  name: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<string | undefined> {
  // First try edge function env vars (set via `supabase secrets set`)
  const envVal = Deno.env.get(name);
  if (envVal) return envVal;

  // Fall back to Supabase Vault via RPC
  try {
    const { data, error } = await serviceClient.rpc("get_vault_secret", {
      secret_name: name,
    });

    if (error) {
      console.error(`vault rpc error for ${name}:`, error.message);
      return undefined;
    }
    return data ?? undefined;
  } catch (err) {
    console.error(`vault exception for ${name}:`, err);
    return undefined;
  }
}
