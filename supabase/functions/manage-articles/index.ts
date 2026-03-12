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
    // body is optional for some actions
  }

  const action = (body.action as string) || "list";
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (action === "list") {
      const limit = Math.min(Number(body.limit) || 50, 200);

      const { data, error } = await supabase
        .from("sent_articles")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "get_sent_urls") {
      const { data, error } = await supabase
        .from("sent_articles")
        .select("article_url, image_url")
        .order("sent_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "add") {
      const { article_url, article_title, keyword_used, email_sent_to, image_url } = body as Record<string, string | null>;

      if (!article_url || !article_title) {
        return json({ success: false, error: "Missing required fields" }, 400);
      }

      const { data, error } = await supabase
        .from("sent_articles")
        .insert({ article_url, article_title, keyword_used, email_sent_to, image_url })
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, data });
    }

    if (action === "delete") {
      const id = body.id as string;
      if (!id) return json({ success: false, error: "Missing id" }, 400);

      const { error } = await supabase
        .from("sent_articles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return json({ success: true });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-articles error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
