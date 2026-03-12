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
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error } = await serviceClient.auth.getUser(token);
  if (error || !user) {
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

/** Create a brand-new workspace + settings row + workspace_users link for userId. */
async function createWorkspace(
  serviceClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  // 1. Insert workspace row
  const { data: ws, error: wsErr } = await serviceClient
    .from("workspaces")
    .insert({ name: "My Workspace" })
    .select("id")
    .single();

  if (wsErr || !ws?.id) throw new Error(`Failed to create workspace: ${wsErr?.message}`);
  const workspaceId: string = ws.id;

  // 2. Insert workspace_settings row (all columns have DB defaults)
  const { error: settingsErr } = await serviceClient
    .from("workspace_settings")
    .insert({ workspace_id: workspaceId });

  if (settingsErr) throw new Error(`Failed to create workspace_settings: ${settingsErr.message}`);

  // 3. Link user to workspace
  await serviceClient
    .from("workspace_users")
    .insert({ user_id: userId, workspace_id: workspaceId });

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
      status,
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  const { userId, error: authError } = await verifyAuth(req);
  if (authError) return authError;

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    // Resolve or create the workspace
    let workspaceId = bodyWsId ?? (await resolveWorkspaceId());

    if (!workspaceId) {
      // No workspace exists yet — create one as part of onboarding
      try {
        workspaceId = await createWorkspace(serviceClient, userId!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return json({ error: msg }, 500);
      }
    }

    const { error } = await serviceClient
      .from("workspace_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, workspaceId });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
