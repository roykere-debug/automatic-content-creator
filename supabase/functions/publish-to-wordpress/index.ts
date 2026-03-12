import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const { title, content, keywords, categories, metaDescription, featuredImage, status, language, sourceUrl, unsplashPhotoUrl, photographerName } = body as {
      title: string;
      content: string;
      keywords: string[];
      categories: string[];
      metaDescription: string;
      featuredImage?: string;
      status: "draft" | "publish";
      language: "hebrew" | "english";
      sourceUrl?: string;
      unsplashPhotoUrl?: string;
      photographerName?: string;
    };

    if (!title || !content) {
      return json({ success: false, error: "Missing title or content" }, 400);
    }

    const workspaceId = await getUserWorkspaceId(userId!);
    if (!workspaceId) return json({ success: false, error: "No workspace found" }, 404);

    const settings = await loadWorkspaceSettings(workspaceId);
    if (!settings?.wordpress_url) {
      return json({ success: false, error: "WordPress not configured" }, 400);
    }

    const wpBase = settings.wordpress_url.replace(/\/$/, "");
    const appPassword = Deno.env.get("WORDPRESS_APP_PASSWORD") || settings.wordpress_app_password;
    const credentials = btoa(`${settings.wordpress_username}:${appPassword}`);

    // Resolve category IDs from names
    const categoryIds: number[] = [];
    if (categories && categories.length > 0) {
      const wpCatRes = await fetch(
        `${wpBase}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`,
        { headers: { Authorization: `Basic ${credentials}` } }
      );
      if (wpCatRes.ok) {
        const wpCats = await wpCatRes.json() as Array<{ id: number; name: string }>;
        for (const catName of categories) {
          const found = wpCats.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (found) categoryIds.push(found.id);
        }
      }
    }

    // Resolve tag IDs from keywords, creating tags that don't exist
    const tagIds: number[] = [];
    if (keywords && keywords.length > 0) {
      for (const keyword of keywords.slice(0, 20)) {
        // Try to find existing tag
        const searchRes = await fetch(
          `${wpBase}/wp-json/wp/v2/tags?search=${encodeURIComponent(keyword)}&per_page=5&_fields=id,name`,
          { headers: { Authorization: `Basic ${credentials}` } }
        );
        if (searchRes.ok) {
          const found = await searchRes.json() as Array<{ id: number; name: string }>;
          const exact = found.find(t => t.name.toLowerCase() === keyword.toLowerCase());
          if (exact) {
            tagIds.push(exact.id);
            continue;
          }
        }
        // Create new tag
        const createRes = await fetch(`${wpBase}/wp-json/wp/v2/tags`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: keyword }),
        });
        if (createRes.ok) {
          const newTag = await createRes.json() as { id: number };
          tagIds.push(newTag.id);
        }
      }
    }

    // Build post content - add source attribution and photographer credit
    let fullContent = content;
    const credits: string[] = [];
    if (sourceUrl) credits.push(`<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">מקור</a>`);
    if (unsplashPhotoUrl && photographerName) {
      credits.push(`📷 <a href="${unsplashPhotoUrl}" target="_blank" rel="noopener noreferrer">${photographerName} / Unsplash</a>`);
    }
    if (credits.length > 0) {
      fullContent += `\n\n<p style="font-size:0.8em;color:#888;">${credits.join(" | ")}</p>`;
    }

    // Upload featured image if provided
    let featuredMediaId: number | null = null;
    if (featuredImage && featuredImage.startsWith("http")) {
      try {
        const imgRes = await fetch(featuredImage);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          const ext = contentType.split("/")[1] || "jpg";
          const filename = `article-image-${Date.now()}.${ext}`;

          const uploadRes = await fetch(`${wpBase}/wp-json/wp/v2/media`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Disposition": `attachment; filename="${filename}"`,
              "Content-Type": contentType,
            },
            body: imgBuffer,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json() as { id: number };
            featuredMediaId = uploadData.id;
          }
        }
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    // Build WP post direction meta for Hebrew
    const isRTL = language === "hebrew";

    const postBody: Record<string, unknown> = {
      title,
      content: fullContent,
      status,
      categories: categoryIds,
      tags: tagIds,
      ...(featuredMediaId && { featured_media: featuredMediaId }),
      ...(metaDescription && {
        meta: { _yoast_wpseo_metadesc: metaDescription },
      }),
    };

    if (isRTL) {
      postBody.meta = { ...(postBody.meta as object || {}), text_direction: "rtl" };
    }

    const wpRes = await fetch(`${wpBase}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    });

    if (!wpRes.ok) {
      const errText = await wpRes.text();
      console.error("WP post creation failed:", wpRes.status, errText);
      return json({ success: false, error: `WordPress error: ${wpRes.status}` }, 500);
    }

    const wpPost = await wpRes.json() as { id: number; link: string };

    return json({
      success: true,
      postId: wpPost.id,
      postUrl: wpPost.link,
    });
  } catch (err) {
    console.error("publish-to-wordpress error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
