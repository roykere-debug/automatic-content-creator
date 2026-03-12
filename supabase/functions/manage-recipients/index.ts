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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON" }),
      { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }

  const action = body.action as string;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (action === "list" || action === "list_active") {
      let query = supabase
        .from("email_recipients")
        .select("*")
        .order("created_at", { ascending: false });

      if (action === "list_active") {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "add") {
      const email = (body.email as string)?.trim();
      const name = (body.name as string | null) ?? null;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ success: false, error: "Invalid email address" }, 400);
      }

      const { data, error } = await supabase
        .from("email_recipients")
        .insert({ email, name, is_active: true })
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "toggle") {
      const id = body.id as string;
      const is_active = body.is_active as boolean;

      if (!id) return json({ success: false, error: "Missing id" }, 400);

      const { data, error } = await supabase
        .from("email_recipients")
        .update({ is_active })
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
        .from("email_recipients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-recipients error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
