import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifyAdmin(req: Request): Promise<{ userId: string | null; error: Response | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      userId: null,
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

  if (!roleData) {
    return {
      userId: null,
      error: new Response(JSON.stringify({ error: "Forbidden: Admin only" }), {
        status: 403,
        headers: { ...openCorsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { userId: user.id, error: null };
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

  const { userId, error: authError } = await verifyAdmin(req);
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
    if (!workspaceId) return json({ workspaceId: null, settings: null }, 404);

    const { data: wsSettings } = await serviceClient
      .from("workspace_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    return json({ workspaceId, settings: wsSettings ?? null });
  }

  // ── action: "update" — save onboarding settings ─────────────────────────────
  if (action === "update") {
    const workspaceId = bodyWsId ?? (await resolveWorkspaceId());
    if (!workspaceId) return json({ error: "No workspace found" }, 404);
    if (!settings) return json({ error: "settings required" }, 400);

    const { error } = await serviceClient
      .from("workspace_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    if (error) return json({ error: error.message }, 500);
    return json({ success: true, workspaceId });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
