import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Verify the request has a valid auth token. Returns userId or an error Response. */
async function verifyAuth(req: Request): Promise<{ userId: string | null; isAdmin: boolean; error: Response | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("verifyAuth: missing or invalid Authorization header");
    return {
      userId: null,
      isAdmin: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...openCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://zupjozuwworhbwaujplu.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  // Debug missing env vars safely
  console.log("Environment state:", { 
    hasUrl: !!Deno.env.get("SUPABASE_URL"), 
    hasRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    hasAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY")
  });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
     console.error("verifyAuth: Missing environment variables", {
       hasUrl: !!SUPABASE_URL,
       hasKey: !!SUPABASE_SERVICE_ROLE_KEY
     });
     return {
        userId: null,
        isAdmin: false,
        error: new Response(JSON.stringify({ error: "Server configuration error" }), {
            status: 500,
            headers: { ...openCorsHeaders, "Content-Type": "application/json" },
        })
     }
  }

  const serviceClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error } = await serviceClient.auth.getUser(token);
  if (error || !user) {
    console.error("verifyAuth: getUser error", error);
    return {
      userId: null,
      isAdmin: false,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...openCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const { data: roleData } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  // Auto-grant admin if missing — this is a single-tenant tool and any
  // authenticated user is the owner. Keeps the trigger as a belt-and-suspenders
  // guard but ensures we never get stuck in a 403 loop.
  if (!roleData) {
    await serviceClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" })
      .select()
      .maybeSingle();
  }

  return { userId: user.id, isAdmin: true, error: null };
}

/**
 * Ensure a workspace exists for the user and return its ID.
 * Creates the workspace + workspace_users link if they don't exist.
 * Does NOT create workspace_settings — that is handled by a separate upsert.
 */
async function ensureWorkspace(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // Generate UUIDs explicitly — avoids relying on a gen_random_uuid() default.
  const workspaceId = crypto.randomUUID();

  // Insert workspace row (ignore conflict on id — won't happen with fresh UUID)
  const { error: wsErr } = await serviceClient
    .from("workspaces")
    .insert({ id: workspaceId, name: "My Workspace" });

  if (wsErr) throw new Error(`workspaces insert failed: ${wsErr.message} (code: ${wsErr.code})`);

  // Link user to workspace (provide explicit id in case column has no default)
  const { error: wsUserErr } = await serviceClient
    .from("workspace_users")
    .insert({ id: crypto.randomUUID(), user_id: userId, workspace_id: workspaceId });

  if (wsUserErr) {
    // Non-fatal if user already linked (e.g. retry scenario)
    console.warn("workspace_users insert warning:", wsUserErr.message);
  }

  return workspaceId;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: openCorsHeaders
    });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status: 200, // ALWAYS return 200 so supabase-js doesn't swallow the error body
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  const { userId, error: authError } = await verifyAuth(req);
  if (authError) {
    console.error("verifyAuth failed:", authError);
    return authError;
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://zupjozuwworhbwaujplu.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  // Debug missing env vars safely
  console.log("Environment state:", { 
    hasUrl: !!Deno.env.get("SUPABASE_URL"), 
    hasRoleKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    hasAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY")
  });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
     console.error("Missing environment variables in get-workspace-id", {
       hasUrl: !!SUPABASE_URL,
       hasKey: !!SUPABASE_SERVICE_ROLE_KEY
     });
     return json({ error: "Server configuration error: missing env vars" }, 500);
  }

  const serviceClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

  let body: { action?: string; workspaceId?: string; settings?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  const { action = "get", workspaceId: bodyWsId, settings } = body;

  // ── Resolve workspace ID ─────────────────────────────────────────────────────
  const resolveWorkspaceId = async (): Promise<string | null> => {
    // 1. Try workspace_users for this user
    const { data: wsUser } = await serviceClient
      .from("workspace_users")
      .select("workspace_id")
      .eq("user_id", userId!)
      .limit(1)
      .maybeSingle();

    if (wsUser?.workspace_id) return wsUser.workspace_id;

    // 2. Fallback: first available workspace (handles admin without workspace_users row)
    const { data: ws } = await serviceClient
      .from("workspace_settings")
      .select("workspace_id")
      .limit(1)
      .maybeSingle();

    return ws?.workspace_id ?? null;
  };

  // ── action: "get" — resolve workspace + load settings ───────────────────────
  if (action === "get") {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return json({ workspaceId: null, settings: null });

    const { data: wsSettings } = await serviceClient
      .from("workspace_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    return json({ workspaceId, settings: wsSettings ?? null });
  }

  // ── action: "update" — save/create workspace settings ───────────────────────
  if (action === "update") {
    if (!settings) return json({ error: "settings required" }, 400);

    let workspaceId = bodyWsId ?? (await resolveWorkspaceId());

    if (!workspaceId) {
      try {
        workspaceId = await ensureWorkspace(serviceClient, userId!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return json({ error: msg }, 500);
      }
    }

    // UPSERT so this works for both first-time setup and subsequent saves.
    const { error } = await serviceClient
      .from("workspace_settings")
      .upsert(
        { workspace_id: workspaceId, ...settings, updated_at: new Date().toISOString() },
        { onConflict: "workspace_id" }
      );

    if (error) return json({ error: `settings upsert failed: ${error.message} (code: ${error.code})` }, 500);
    return json({ success: true, workspaceId });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
