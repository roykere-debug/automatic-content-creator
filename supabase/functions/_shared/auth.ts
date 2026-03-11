import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Verify admin access from Authorization header.
 * Returns the user ID if authorized, null otherwise.
 */
export async function verifyAdminAccess(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<{ error: Response | null; userId: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
      userId: null,
    };
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  // deno-lint-ignore no-explicit-any
  const { data: claimsData, error: claimsError } = await (supabaseClient.auth as any).getClaims(token);

  if (claimsError || !claimsData?.claims) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
      userId: null,
    };
  }

  const userId = claimsData.claims.sub;

  // Check admin role
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
      userId: null,
    };
  }

  return { error: null, userId };
}

/**
 * Get the workspace ID for a user.
 * Returns the first workspace where the user has access.
 */
export async function getUserWorkspaceId(userId: string): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  return data?.workspace_id || null;
}
