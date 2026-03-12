import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings } from "../_shared/workspace-loader.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
  if (authError) return authError;

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return json({ success: false, error: "Invalid JSON" }, 400);
    }

    const action = (body.action as string) || "check_url";
    const workspaceId = await getUserWorkspaceId(userId!);
    if (!workspaceId) return json({ success: false, error: "No workspace found" }, 404);

    const settings = await loadWorkspaceSettings(workspaceId);
    if (!settings?.wordpress_url) {
      return json({ success: false, error: "WordPress not configured" }, 400);
    }

    const wpBase = settings.wordpress_url.replace(/\/$/, "");
    const appPassword = Deno.env.get("WORDPRESS_APP_PASSWORD") || settings.wordpress_app_password;
    const credentials = btoa(`${settings.wordpress_username}:${appPassword}`);

    if (action === "check_url") {
      const url = body.url as string;
      if (!url) return json({ success: false, error: "Missing url" }, 400);

      // Search WordPress for posts containing this URL in the content
      const searchQuery = encodeURIComponent(url);
      const wpUrl = `${wpBase}/wp-json/wp/v2/posts?search=${searchQuery}&per_page=5&_fields=id,title,status,link,date`;

      const wpRes = await fetch(wpUrl, {
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (!wpRes.ok) {
        console.error("WP search failed:", wpRes.status, await wpRes.text());
        return json({ exists: false, posts: [] });
      }

      const posts = await wpRes.json();
      return json({ exists: posts.length > 0, posts });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("check-wordpress-posts error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
