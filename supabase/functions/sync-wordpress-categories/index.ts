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
    const workspaceId = await getUserWorkspaceId(userId!);
    if (!workspaceId) return json({ success: false, error: "No workspace found" }, 404);

    const settings = await loadWorkspaceSettings(workspaceId);
    if (!settings?.wordpress_url) {
      return json({ success: false, error: "WordPress not configured" }, 400);
    }

    const wpBase = settings.wordpress_url.replace(/\/$/, "");
    const appPassword = Deno.env.get("WORDPRESS_APP_PASSWORD") || settings.wordpress_app_password;
    const credentials = btoa(`${settings.wordpress_username}:${appPassword}`);

    // Fetch all categories (paginate if needed)
    let allCategories: unknown[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const wpUrl = `${wpBase}/wp-json/wp/v2/categories?per_page=${perPage}&page=${page}&_fields=id,name,slug,count,parent`;
      const wpRes = await fetch(wpUrl, {
        headers: { Authorization: `Basic ${credentials}` },
      });

      if (!wpRes.ok) {
        const errText = await wpRes.text();
        console.error("WP categories fetch failed:", wpRes.status, errText);
        return json({ success: false, error: "Failed to fetch WordPress categories" }, 500);
      }

      const cats = await wpRes.json();
      allCategories = allCategories.concat(cats);

      const totalPages = parseInt(wpRes.headers.get("X-WP-TotalPages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    return json({ success: true, categories: allCategories, total: allCategories.length });
  } catch (err) {
    console.error("sync-wordpress-categories error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
