/**
 * AutoPilot Content — Generalized Daily Digest
 *
 * KEY GENERALIZATION CHANGES from the original i-HLS version:
 *
 * 1. All configuration is loaded from workspace_settings at startup
 * 2. RSS_FEEDS → workspace.rss_feeds
 * 3. STRONG/WEAK/TECH keywords → workspace.keywords
 * 4. EXCLUDED_KEYWORDS → workspace.excluded_keywords
 * 5. MILITARY_DOMAIN_BLACKLIST + PAYWALL_SITES → workspace.excluded_domains
 * 6. PRIORITY_SOURCES → workspace.priority_sources
 * 7. RSS_TRUSTED_DOMAINS → workspace.trusted_domains
 * 8. FALLBACK_IMAGES → workspace.fallback_images
 * 9. Email branding (i-HLS, UNCLASSIFIED bar, military theme) → workspace.brand_name, theme_colors
 * 10. Dashboard URL → workspace.dashboard_url
 * 11. Email subject → derived from workspace.brand_name
 *
 * The internal scanning/ranking/email-sending logic is identical to the original.
 * Only the data sources are now dynamic per workspace.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { parseFeed } from "https://deno.land/x/rss@1.0.0/mod.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings, getDefaultWorkspaceId, type WorkspaceSettings } from "../_shared/workspace-loader.ts";

// ============================================================
// UNIVERSAL CONSTANTS (apply to all workspaces)
// ============================================================

// Paywall sites — always excluded regardless of workspace vertical
const UNIVERSAL_PAYWALL_SITES = [
  "wsj.com", "ft.com", "economist.com", "bloomberg.com", "nytimes.com",
  "washingtonpost.com", "thetimes.co.uk", "telegraph.co.uk", "haaretz.com",
  "theinformation.com", "businessinsider.com", "seekingalpha.com", "barrons.com",
  "latimes.com", "fortune.com", "pitchbook.com",
];

// ============================================================
// TYPES
// ============================================================

interface DigestArticle {
  primaryTitle: string;
  secondaryTitle: string;
  url: string;
  imageUrl: string;
  source: string;
  sourceType?: "rss" | "tavily";
}

interface RssEntry {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  source: string;
  score: number;
}

// ============================================================
// DOMAIN FILTERING (workspace-aware)
// ============================================================

function isExcludedDomain(url: string, settings: WorkspaceSettings): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      settings.excluded_domains.some((d) => hostname.includes(d)) ||
      UNIVERSAL_PAYWALL_SITES.some((d) => hostname.includes(d))
    );
  } catch {
    return false;
  }
}

// ============================================================
// KEYWORD SCORING (workspace-aware)
// ============================================================

function scoreArticle(title: string, content: string, settings: WorkspaceSettings): number {
  const text = `${title} ${content}`.toLowerCase();

  // Check exclusions
  for (const kw of settings.excluded_keywords) {
    if (text.includes(kw.toLowerCase())) return 0;
  }

  let score = 0;
  for (const kw of settings.keywords.strong) {
    if (text.includes(kw.toLowerCase())) score += 3;
  }
  for (const kw of settings.keywords.tech) {
    if (text.includes(kw.toLowerCase())) score += 2;
  }
  for (const kw of settings.keywords.weak) {
    if (text.includes(kw.toLowerCase())) score += 1;
  }

  return score;
}

// ============================================================
// RSS FEED PARSING
// ============================================================

async function parseRssFeeds(settings: WorkspaceSettings): Promise<RssEntry[]> {
  const feeds = settings.rss_feeds;
  if (!feeds || feeds.length === 0) {
    console.log("[daily-digest] No RSS feeds configured for workspace");
    return [];
  }

  const allEntries: RssEntry[] = [];

  for (const feed of feeds) {
    try {
      console.log(`[daily-digest] Parsing feed: ${feed.name}`);
      const response = await fetch(feed.url, {
        headers: { "User-Agent": `${settings.brand_name}-Digest/1.0` },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[daily-digest] Feed ${feed.name} returned ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const parsed = await parseFeed(xml);
      const now = Date.now();
      const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

      for (const entry of parsed.entries || []) {
        const url = entry.id || entry.links?.[0]?.href || "";
        if (!url) continue;
        if (isExcludedDomain(url, settings)) continue;

        const pubDate = entry.published || entry.updated;
        const pubTime = pubDate ? new Date(pubDate).getTime() : 0;
        if (pubTime && pubTime < fortyEightHoursAgo) continue;

        const title = entry.title?.value || "";
        const content = entry.description?.value || entry.content?.value || "";

        const score = scoreArticle(title, content, settings);
        if (score === 0) continue;

        // Priority boost for trusted sources
        const hostname = new URL(url).hostname.toLowerCase();
        const isPriority = settings.priority_sources.some((s) => hostname.includes(s));
        const priorityBoost = isPriority ? 5 : 0;
        const feedBoost = feed.priority === 1 ? 2 : 0;

        allEntries.push({
          title,
          url,
          content: content.substring(0, 500),
          publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: feed.name,
          score: score + priorityBoost + feedBoost,
        });
      }
    } catch (error) {
      console.error(`[daily-digest] Error parsing feed ${feed.name}:`, error);
    }
  }

  // Sort by score descending
  return allEntries.sort((a, b) => b.score - a.score);
}

// ============================================================
// EMAIL TEMPLATE (workspace-branded)
// ============================================================

function buildDigestEmailHtml(
  articles: DigestArticle[],
  settings: WorkspaceSettings,
  language: "he" | "en" = "en"
): string {
  const { brand_name, theme_colors, dashboard_url } = settings;
  const isRtl = language === "he";
  const dir = isRtl ? "rtl" : "ltr";

  const subject = isRtl
    ? `${brand_name} · סיכום יומי`
    : `${brand_name} · Daily Digest`;

  const articlesHtml = articles
    .map(
      (article) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          ${article.imageUrl ? `<img src="${article.imageUrl}" style="width:100%;height:160px;object-fit:cover;border-radius:6px;margin-bottom:8px;" alt="" />` : ""}
          <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#ffffff;">
            <a href="${article.url}" style="color:#ffffff;text-decoration:none;">
              ${isRtl ? article.secondaryTitle : article.primaryTitle}
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#888;">${article.source}</p>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${theme_colors.background || "#0f172a"};font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,${theme_colors.primary || "#3b82f6"},${theme_colors.accent || "#10b981"});padding:20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${brand_name}</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${subject}</p>
    </td>
  </tr>
  <!-- Articles -->
  <tr>
    <td style="background:${theme_colors.surface || "#1e293b"};padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${articlesHtml}
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:${theme_colors.background || "#0f172a"};padding:16px;text-align:center;">
      <p style="color:#666;font-size:12px;margin:0;">Powered by ${brand_name}</p>
      ${dashboard_url ? `<p style="margin:4px 0 0;"><a href="${dashboard_url}" style="color:${theme_colors.primary || "#3b82f6"};font-size:12px;">View Dashboard</a></p>` : ""}
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ============================================================
// TITLE GENERATION (workspace-language-aware)
// ============================================================

async function generateTitles(
  entries: RssEntry[],
  settings: WorkspaceSettings
): Promise<DigestArticle[]> {
  const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
  const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

  const primary = settings.primary_language || "en";
  const secondary = settings.supported_languages?.[1] || "he";

  const articles: DigestArticle[] = [];

  for (const entry of entries.slice(0, 5)) {
    const fallbackImages = settings.fallback_images.length > 0 ? settings.fallback_images : [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
    ];

    if (!aiApiKey) {
      // Fallback: use original title without AI
      articles.push({
        primaryTitle: entry.title,
        secondaryTitle: entry.title,
        url: entry.url,
        imageUrl: fallbackImages[articles.length % fallbackImages.length],
        source: entry.source,
        sourceType: "rss",
      });
      continue;
    }

    try {
      const response = await fetch(aiGatewayUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a news editor for ${settings.brand_name}. Generate compelling headlines for articles. Return JSON: {"${primary}Title": "...", "${secondary}Title": "..."}`,
            },
            {
              role: "user",
              content: `Original title: ${entry.title}\nSource: ${entry.source}\nGenerate engaging headlines in ${primary} and ${secondary}.`,
            },
          ],
          temperature: 0.5,
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";
        let parsed: Record<string, string> = {};
        try {
          let cleaned = content.trim();
          if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
          parsed = JSON.parse(cleaned);
        } catch { /* ignore */ }

        articles.push({
          primaryTitle: parsed[`${primary}Title`] || entry.title,
          secondaryTitle: parsed[`${secondary}Title`] || entry.title,
          url: entry.url,
          imageUrl: fallbackImages[articles.length % fallbackImages.length],
          source: entry.source,
          sourceType: "rss",
        });
      } else {
        articles.push({
          primaryTitle: entry.title,
          secondaryTitle: entry.title,
          url: entry.url,
          imageUrl: fallbackImages[articles.length % fallbackImages.length],
          source: entry.source,
          sourceType: "rss",
        });
      }
    } catch {
      articles.push({
        primaryTitle: entry.title,
        secondaryTitle: entry.title,
        url: entry.url,
        imageUrl: fallbackImages[articles.length % fallbackImages.length],
        source: entry.source,
        sourceType: "rss",
      });
    }
  }

  return articles;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  try {
    // Support both manual (admin-authenticated) and scheduled (service-role) invocations
    const isScheduled = req.headers.get("x-scheduled") === "true";

    let settings: WorkspaceSettings | null = null;

    if (isScheduled) {
      // Scheduled: process ALL workspaces
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: workspaces } = await supabase.from("workspaces").select("id");

      if (!workspaces || workspaces.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No workspaces to process" }), {
          headers: { ...openCorsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const ws of workspaces) {
        const wsSettings = await loadWorkspaceSettings(ws.id);
        if (!wsSettings) continue;
        const result = await runDigestForWorkspace(ws.id, wsSettings);
        results.push(result);
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...openCorsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Manual: admin-authenticated
      const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
      if (authError || !userId) return authError!;

      const body = await req.json().catch(() => ({}));
      const workspaceId = body.workspace_id || (await getUserWorkspaceId(userId)) || (await getDefaultWorkspaceId());

      if (!workspaceId) {
        return new Response(
          JSON.stringify({ success: false, error: "No workspace found" }),
          { status: 404, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
        );
      }

      settings = await loadWorkspaceSettings(workspaceId);
      if (!settings) {
        return new Response(
          JSON.stringify({ success: false, error: "Workspace settings not found" }),
          { status: 404, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await runDigestForWorkspace(workspaceId, settings);
      return new Response(JSON.stringify(result), {
        headers: { ...openCorsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("[daily-digest] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================
// DIGEST RUNNER (per workspace)
// ============================================================

async function runDigestForWorkspace(workspaceId: string, settings: WorkspaceSettings) {
  console.log(`[daily-digest] Running for workspace: ${workspaceId} (${settings.brand_name})`);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1. Parse RSS feeds (using workspace config)
  const entries = await parseRssFeeds(settings);
  console.log(`[daily-digest] ${entries.length} scored articles from RSS feeds`);

  if (entries.length === 0) {
    return { success: true, workspaceId, message: "No articles found matching workspace keywords" };
  }

  // 2. Deduplicate against already-sent articles
  const { data: sentUrls } = await supabase
    .from("sent_articles")
    .select("article_url")
    .eq("workspace_id", workspaceId)
    .gte("sent_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

  const sentUrlSet = new Set((sentUrls || []).map((r: { article_url: string }) => r.article_url));
  const newEntries = entries.filter((e) => !sentUrlSet.has(e.url));
  console.log(`[daily-digest] ${newEntries.length} new articles after dedup`);

  if (newEntries.length === 0) {
    return { success: true, workspaceId, message: "All articles already sent" };
  }

  // 3. Generate bilingual titles
  const digestArticles = await generateTitles(newEntries, settings);
  console.log(`[daily-digest] Generated titles for ${digestArticles.length} articles`);

  // 4. Get email recipients for this workspace
  const { data: recipients } = await supabase
    .from("email_recipients")
    .select("email")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  if (!recipients || recipients.length === 0) {
    console.log(`[daily-digest] No active recipients for workspace ${workspaceId}`);
    // Still record as sent
    await recordSentArticles(supabase, workspaceId, digestArticles, null);
    return { success: true, workspaceId, message: "No recipients configured", articlesFound: digestArticles.length };
  }

  // 5. Send emails (workspace-branded template)
  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
  const primaryLang = (settings.primary_language as "he" | "en") || "en";
  const emailHtml = buildDigestEmailHtml(digestArticles, settings, primaryLang);
  const emailSubject = primaryLang === "he"
    ? `${settings.brand_name} · סיכום יומי · ${new Date().toLocaleDateString("he-IL")}`
    : `${settings.brand_name} · Daily Digest · ${new Date().toLocaleDateString("en-US")}`;

  const fromAddress = settings.email_from_address || `noreply@${Deno.env.get("EMAIL_DOMAIN") || "resend.dev"}`;
  const fromName = settings.email_sender_name || settings.brand_name;

  let emailsSent = 0;
  for (const recipient of recipients) {
    try {
      await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: recipient.email,
        subject: emailSubject,
        html: emailHtml,
      });
      emailsSent++;
    } catch (error) {
      console.error(`[daily-digest] Failed to send email to ${recipient.email}:`, error);
    }
  }

  // 6. Record sent articles
  await recordSentArticles(supabase, workspaceId, digestArticles, recipients[0]?.email || null);

  return {
    success: true,
    workspaceId,
    brand: settings.brand_name,
    articlesFound: digestArticles.length,
    emailsSent,
    recipients: recipients.length,
  };
}

// deno-lint-ignore no-explicit-any
async function recordSentArticles(
  supabase: ReturnType<typeof createClient<any>>,
  workspaceId: string,
  articles: DigestArticle[],
  emailSentTo: string | null
) {
  const records = articles.map((a) => ({
    workspace_id: workspaceId,
    article_url: a.url,
    article_title: a.primaryTitle,
    email_sent_to: emailSentTo,
    image_url: a.imageUrl,
    sent_at: new Date().toISOString(),
  }));

  if (records.length > 0) {
    const { error } = await supabase.from("sent_articles").upsert(records, { onConflict: "article_url,workspace_id" });
    if (error) console.error("[daily-digest] Error recording sent articles:", error);
  }
}
