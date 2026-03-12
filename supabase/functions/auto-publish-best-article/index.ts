import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings, getDefaultWorkspaceId } from "../_shared/workspace-loader.ts";
import type { WorkspaceSettings } from "../../../packages/core/src/config/types.ts";
import { PAYWALL_SITES as UNIVERSAL_PAYWALL_SITES } from "../../../packages/core/src/config/defaults.ts";
import { scoreArticleRelevance } from "../../../packages/core/src/services/keyword-filter.ts";
import { buildArticleSystemPrompt } from "../../../packages/core/src/prompts/article-generation.ts";
import { buildArticleEmailHtml } from "../../../packages/core/src/templates/email-article.ts";

// ==================== TYPES ====================

interface Candidate {
  title: string;
  url: string;
  content: string;
  source: string;
  publishedAt: string;
  score: number;
}

interface GeneratedArticle {
  title: string;
  content: string;
  tags?: string[];
  suggestedCategories?: string[];
}

interface Generated {
  primary: GeneratedArticle;
  secondary?: GeneratedArticle;
}

// ==================== RSS FETCHING ====================

async function fetchRssFeed(
  feedUrl: string,
  feedName: string,
  settings: WorkspaceSettings,
  seen: Set<string>
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const excludedDomains = [...(settings.excluded_domains ?? []), ...UNIVERSAL_PAYWALL_SITES];

  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": `${settings.brand_name}-Bot/1.0` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return candidates;

    const xml = await res.text();
    const feed = await parseFeed(xml);

    for (const entry of feed.entries ?? []) {
      const url = entry.links?.[0]?.href ?? "";
      if (!url || seen.has(url)) continue;

      // Domain filter
      try {
        const host = new URL(url).hostname.replace("www.", "");
        if (excludedDomains.some((d) => host.includes(d))) continue;
      } catch {
        continue;
      }

      const title = entry.title?.value ?? "";
      const description = entry.description?.value ?? "";
      const text = `${title} ${description}`.toLowerCase();

      const keywords = settings.keywords ?? {};
      const result = scoreArticleRelevance(
        title,
        description,
        [
          ...(keywords.strong ?? []),
          ...(keywords.tech ?? []),
          ...(keywords.weak ?? []),
        ],
        settings.excluded_keywords ?? []
      );

      if (result.excluded || result.score < 3) continue;

      seen.add(url);
      candidates.push({
        title,
        url,
        content: description,
        source: feedName,
        publishedAt: entry.published?.toISOString() ?? new Date().toISOString(),
        score: result.score,
      });
    }
  } catch (e) {
    console.error(`RSS fetch error for ${feedName}:`, e);
  }

  return candidates;
}

async function fetchAllCandidates(settings: WorkspaceSettings, supabaseUrl: string, supabaseKey: string): Promise<Candidate[]> {
  console.log("=== STEP 1: Fetching candidates from RSS feeds ===");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const seen = new Set<string>();

  // Load already-published URLs from DB (last 7 days)
  const { data: published } = await supabase
    .from("articles")
    .select("source_url")
    .eq("workspace_id", settings.workspace_id)
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

  for (const row of published ?? []) {
    if (row.source_url) seen.add(row.source_url);
  }

  console.log(`Already published: ${seen.size} URLs`);

  const rssFeeds = settings.rss_feeds ?? [];
  if (rssFeeds.length === 0) {
    console.warn("No RSS feeds configured for this workspace");
    return [];
  }

  const allCandidates: Candidate[] = [];
  for (const feed of rssFeeds) {
    const results = await fetchRssFeed(feed.url, feed.name, settings, seen);
    allCandidates.push(...results);
  }

  allCandidates.sort((a, b) => b.score - a.score);
  console.log(`Total candidates after scoring: ${allCandidates.length}`);
  return allCandidates;
}

// ==================== FULL CONTENT FETCH ====================

async function fetchFullContent(url: string, brandName: string): Promise<string> {
  console.log("=== STEP 3: Fetching full content via Firecrawl ===");

  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (FIRECRAWL_API_KEY) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      });

      if (res.ok) {
        const data = await res.json();
        const markdown = data.data?.markdown ?? data.markdown ?? "";
        if (markdown.length > 200) return markdown.substring(0, 8000);
      }
    } catch (e) {
      console.error("Firecrawl error:", e);
    }
  }

  // Fallback: raw fetch
  try {
    const res = await fetch(url, { headers: { "User-Agent": `${brandName}-Bot/1.0` } });
    if (res.ok) {
      const html = await res.text();
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .substring(0, 5000);
    }
  } catch (e) {
    console.error("HTML fallback error:", e);
  }

  return "";
}

// ==================== ARTICLE GENERATION ====================

async function generateArticle(
  title: string,
  content: string,
  url: string,
  source: string,
  settings: WorkspaceSettings
): Promise<Generated | null> {
  console.log("=== STEP 4: Generating article with AI ===");

  const AI_GATEWAY_URL = Deno.env.get("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1/chat/completions";
  const API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const bilingual = settings.bilingual_mode && (settings.supported_languages?.length ?? 0) > 1;
  const secondaryLang = settings.supported_languages?.find((l) => l !== settings.primary_language);

  const systemPrompt = buildArticleSystemPrompt(settings, bilingual ? secondaryLang : undefined);
  const userPrompt = `Source: ${source}\nURL: ${url}\n\nTitle: ${title}\n\nContent:\n${content.substring(0, 6000)}`;

  try {
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      console.error("AI error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    if (!parsed.primary?.title) {
      console.error("AI response missing primary article");
      return null;
    }

    return {
      primary: parsed.primary,
      secondary: parsed.secondary,
    };
  } catch (e) {
    console.error("Generation error:", e);
    return null;
  }
}

// ==================== UNSPLASH ====================

async function getUnsplashImage(
  query: string,
  settings: WorkspaceSettings
): Promise<string | null> {
  const key = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!key) return (settings.fallback_images ?? [])[0] ?? null;

  const searchQuery = query.split(" ").slice(0, 4).join(" ");

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&orientation=landscape&per_page=5`,
      { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error("Unsplash failed");
    const data = await res.json();
    const photo = data.results?.[0];
    return photo?.urls?.regular ?? (settings.fallback_images ?? [])[0] ?? null;
  } catch {
    return (settings.fallback_images ?? [])[0] ?? null;
  }
}

// ==================== WORDPRESS ====================

async function publishToWordPress(
  article: GeneratedArticle,
  categories: number[],
  imageUrl: string | null,
  sourceUrl: string,
  settings: WorkspaceSettings
): Promise<{ id: number; link: string } | null> {
  const { wordpress_url, wordpress_username, wordpress_app_password } = settings;
  if (!wordpress_url || !wordpress_username || !wordpress_app_password) return null;

  const credentials = btoa(`${wordpress_username}:${wordpress_app_password}`);
  const apiBase = `${wordpress_url}/wp-json/wp/v2`;

  // Upload featured image
  let featuredMediaId: number | null = null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        const filename = `article-${Date.now()}.jpg`;
        const uploadRes = await fetch(`${apiBase}/media`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": "image/jpeg",
          },
          body: blob,
          signal: AbortSignal.timeout(30000),
        });
        if (uploadRes.ok) {
          const media = await uploadRes.json();
          featuredMediaId = media.id;
        }
      }
    } catch (e) {
      console.error("Image upload error:", e);
    }
  }

  // Format content
  const paragraphs = article.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("\n");

  const sourceNote = `<p><em>Source: <a href="${sourceUrl}" rel="noopener noreferrer">Original Article</a></em></p>`;
  const fullContent = `${paragraphs}\n${sourceNote}`;

  const payload: Record<string, unknown> = {
    title: article.title,
    content: fullContent,
    status: "publish",
    categories,
    tags: article.tags ?? [],
  };

  if (featuredMediaId) payload.featured_media = featuredMediaId;

  try {
    const res = await fetch(`${apiBase}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      console.error("WP publish error:", res.status, await res.text());
      return null;
    }

    const post = await res.json();
    return { id: post.id, link: post.link };
  } catch (e) {
    console.error("WP publish exception:", e);
    return null;
  }
}

async function resolveWPCategories(
  suggestedCategories: string[],
  settings: WorkspaceSettings
): Promise<number[]> {
  const { wordpress_url, wordpress_username, wordpress_app_password } = settings;
  if (!wordpress_url || !wordpress_username || !wordpress_app_password) return [];

  const credentials = btoa(`${wordpress_username}:${wordpress_app_password}`);
  const apiBase = `${wordpress_url}/wp-json/wp/v2`;

  try {
    const res = await fetch(`${apiBase}/categories?per_page=100`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const allCats: Array<{ id: number; name: string; slug: string }> = await res.json();
    const blacklist = settings.category_blacklist ?? [];
    const categoryMap = settings.category_map ?? {};
    const alwaysInclude = settings.always_include_category;

    const matchedIds = new Set<number>();

    // Always-include category
    if (alwaysInclude) {
      const always = allCats.find((c) => c.slug === alwaysInclude || c.name.toLowerCase() === alwaysInclude.toLowerCase());
      if (always) matchedIds.add(always.id);
    }

    // Default categories from workspace
    for (const defaultCat of settings.default_categories ?? []) {
      const cat = allCats.find((c) => c.slug === defaultCat || c.name.toLowerCase() === defaultCat.toLowerCase());
      if (cat && !blacklist.includes(cat.slug)) matchedIds.add(cat.id);
    }

    // AI-suggested categories with category_map override
    for (const suggested of suggestedCategories) {
      const mapped = categoryMap[suggested.toLowerCase()] ?? suggested;
      const cat = allCats.find(
        (c) => c.name.toLowerCase() === mapped.toLowerCase() || c.slug === mapped.toLowerCase().replace(/\s/g, "-")
      );
      if (cat && !blacklist.includes(cat.slug)) matchedIds.add(cat.id);
    }

    return [...matchedIds];
  } catch (e) {
    console.error("WP category resolution error:", e);
    return [];
  }
}

// ==================== NOTIFY ====================

async function sendNotificationEmail(
  article: GeneratedArticle,
  wpPost: { id: number; link: string },
  sourceUrl: string,
  imageUrl: string | null,
  settings: WorkspaceSettings
): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const NOTIFY_EMAIL = Deno.env.get("NOTIFY_EMAIL");
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return;

  const resend = new Resend(RESEND_API_KEY);

  const articleData = {
    title: article.title,
    content: article.content.substring(0, 500) + "...",
    source: "Auto-Published",
    url: wpPost.link,
    image: imageUrl ?? undefined,
  };

  const html = buildArticleEmailHtml(articleData, settings);

  await resend.emails.send({
    from: `${settings.email_sender_name || settings.brand_name} <${settings.email_from_address || "noreply@autopilot.content"}>`,
    to: [NOTIFY_EMAIL],
    subject: `[Auto-Published] ${article.title}`,
    html,
  });
}

// ==================== MAIN ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const isScheduled = req.headers.get("x-scheduled") === "true";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Determine which workspaces to process
  let workspaceIds: string[];
  if (isScheduled) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: workspaces } = await supabase.from("workspaces").select("id");
    workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id);
  } else {
    const wsId = body.workspaceId ?? (await getUserWorkspaceId(userId!));
    if (!wsId) {
      return new Response(
        JSON.stringify({ success: false, error: "Workspace not found" }),
        { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }
    workspaceIds = [wsId];
  }

  const results: Record<string, unknown> = {};

  for (const workspaceId of workspaceIds) {
    console.log(`\n====== Processing workspace: ${workspaceId} ======`);

    try {
      const settings = await loadWorkspaceSettings(workspaceId);

      // STEP 1: Fetch candidates
      const candidates = await fetchAllCandidates(settings, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (candidates.length === 0) {
        results[workspaceId] = { skipped: true, reason: "No candidates found" };
        continue;
      }

      // STEP 2: Pick best (already sorted by score; take top article with score >= 5)
      const best = candidates.find((c) => c.score >= 5);
      if (!best) {
        results[workspaceId] = { skipped: true, reason: "No article above score threshold" };
        continue;
      }
      console.log(`Best candidate: [score=${best.score}] ${best.title}`);

      // STEP 3: Fetch full content
      const fullContent = await fetchFullContent(best.url, settings.brand_name);

      // STEP 4: Generate article
      const generated = await generateArticle(
        best.title,
        fullContent || best.content,
        best.url,
        best.source,
        settings
      );
      if (!generated) {
        results[workspaceId] = { error: "Article generation failed" };
        continue;
      }

      // STEP 5: Get image
      const imageUrl = await getUnsplashImage(
        generated.primary.title || best.title,
        settings
      );

      // STEP 6: Resolve WordPress categories
      const suggestedCats = generated.primary.suggestedCategories ?? [];
      const categoryIds = await resolveWPCategories(suggestedCats, settings);
      console.log(`Resolved ${categoryIds.length} categories`);

      // STEP 7: Publish to WordPress
      const wpResult = await publishToWordPress(generated.primary, categoryIds, imageUrl, best.url, settings);
      if (!wpResult) {
        // Retry once after 10s
        await new Promise((r) => setTimeout(r, 10000));
        const retry = await publishToWordPress(generated.primary, categoryIds, imageUrl, best.url, settings);
        if (!retry) {
          results[workspaceId] = { error: "WordPress publish failed after retry" };
          continue;
        }
        Object.assign(wpResult ?? {}, retry);
      }

      console.log(`Published: ${wpResult!.link}`);

      // STEP 8: Notify
      await sendNotificationEmail(generated.primary, wpResult!, best.url, imageUrl, settings);

      // STEP 9: Record in DB
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from("articles").insert({
        workspace_id: workspaceId,
        title: generated.primary.title,
        content: generated.primary.content,
        source_url: best.url,
        source_name: best.source,
        image_url: imageUrl,
        wordpress_post_id: wpResult!.id,
        wordpress_url: wpResult!.link,
        status: "published",
      });

      results[workspaceId] = {
        success: true,
        title: generated.primary.title,
        wpUrl: wpResult!.link,
        score: best.score,
      };
    } catch (e) {
      console.error(`Error processing workspace ${workspaceId}:`, e);
      results[workspaceId] = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
  );
});
