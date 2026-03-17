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

  const token = authHeader.replace("Bearer ", "");
  
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
     console.error("verifyAdminAccess: Missing environment variables");
     return {
        error: new Response(
          JSON.stringify({ success: false, error: "Server configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        ),
        userId: null,
     }
  }

  const serviceClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);

  if (userError || !user) {
    return {
      error: new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      ),
      userId: null,
    };
  }

  const userId = user.id;

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
 * First checks workspace_users for a direct link.
 * Falls back to the first workspace in workspace_settings (handles admins
 * who haven't been explicitly linked via workspace_users yet).
 */
export async function getUserWorkspaceId(userId: string): Promise<string | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("getUserWorkspaceId: Missing environment variables");
    return null;
  }

  const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Direct link via workspace_users
  const { data: wsUser } = await supabase
    .from("workspace_users")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (wsUser?.workspace_id) return wsUser.workspace_id;

  // 2. Fallback: return the first available workspace (single-tenant / first-run)
  const { data: ws } = await supabase
    .from("workspace_settings")
    .select("workspace_id")
    .limit(1)
    .maybeSingle();

  return ws?.workspace_id ?? null;
}
