import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  const { error: authError } = await verifyAdminAccess(req, openCorsHeaders);
  if (authError) return authError;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // body optional
  }

  const action = (body.action as string) || "list";
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (action === "list") {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "add") {
      const user_id = body.user_id as string;
      const role = (body.role as string) || "user";

      if (!user_id) return json({ success: false, error: "Missing user_id" }, 400);
      if (!["admin", "user"].includes(role)) {
        return json({ success: false, error: "Invalid role" }, 400);
      }

      const { data, error } = await supabase
        .from("user_roles")
        .upsert({ user_id, role }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "update") {
      const id = body.id as string;
      const role = body.role as string;

      if (!id || !role) return json({ success: false, error: "Missing id or role" }, 400);
      if (!["admin", "user"].includes(role)) {
        return json({ success: false, error: "Invalid role" }, 400);
      }

      const { data, error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "delete") {
      const id = body.id as string;
      if (!id) return json({ success: false, error: "Missing id" }, 400);

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-user-roles error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
