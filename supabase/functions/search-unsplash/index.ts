import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess } from "../_shared/auth.ts";

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { thumb: string; small: string; regular: string; full: string };
  links: { html: string };
  user: { name: string; username: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  const { error: authError } = await verifyAdminAccess(req, openCorsHeaders);
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

    const query = (body.query as string)?.trim();
    const page = Math.max(1, Number(body.page) || 1);
    const perPage = Math.min(30, Math.max(1, Number(body.perPage) || 12));

    if (!query) {
      return json({ success: false, error: "Missing query" }, 400);
    }

    const unsplashAccessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!unsplashAccessKey) {
      return json({ success: false, error: "Unsplash not configured" }, 500);
    }

    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`;

    const unsplashRes = await fetch(unsplashUrl, {
      headers: { Authorization: `Client-ID ${unsplashAccessKey}` },
    });

    if (!unsplashRes.ok) {
      const errText = await unsplashRes.text();
      console.error("Unsplash error:", unsplashRes.status, errText);
      return json({ success: false, error: "Unsplash API error" }, 500);
    }

    const data = await unsplashRes.json() as { total: number; results: UnsplashPhoto[] };

    const photos = data.results.map((photo) => ({
      id: photo.id,
      description: photo.description || photo.alt_description || "",
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      regular: photo.urls.regular,
      full: photo.urls.full,
      photographerName: photo.user.name,
      photographerUsername: photo.user.username,
      unsplashUrl: photo.links.html,
    }));

    return json({ success: true, photos, total: data.total, page, perPage });
  } catch (err) {
    console.error("search-unsplash error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
