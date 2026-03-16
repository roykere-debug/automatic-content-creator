import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Read a secret from Supabase Vault (vault.decrypted_secrets).
 * Falls back to Deno.env.get() for backwards compatibility with
 * secrets set directly as edge function environment variables.
 */
export async function getVaultSecret(
  name: string,
  serviceClient: ReturnType<typeof createClient>
): Promise<string | undefined> {
  // First try edge function env vars (set via `supabase secrets set`)
  const envVal = Deno.env.get(name);
  if (envVal) return envVal;

  // Fall back to Supabase Vault
  try {
    const { data, error } = await (serviceClient as any)
      .schema("vault")
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      console.error(`vault read error for ${name}:`, error.message);
      return undefined;
    }
    return data?.decrypted_secret ?? undefined;
  } catch (err) {
    console.error(`vault exception for ${name}:`, err);
    return undefined;
  }
}
