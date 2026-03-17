import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings } from "../_shared/workspace-loader.ts";
import { getVaultSecret } from "../_shared/vault.ts";

/**
 * Generalized news search edge function.
 * Reads domain blacklists, search queries, and fallback images from workspace_settings.
 * No hardcoded defense-tech domains or keywords.
 */

// Universal paywall sites (applies to all workspaces)
const PAYWALL_SITES = [
  "wsj.com", "ft.com", "economist.com", "bloomberg.com", "nytimes.com",
  "washingtonpost.com", "thetimes.co.uk", "telegraph.co.uk", "haaretz.com",
  "theinformation.com", "businessinsider.com", "seekingalpha.com", "barrons.com",
  "latimes.com", "fortune.com", "pitchbook.com",
];

const RequestSchema = z.object({
  query: z.string().max(200).optional(),
  maxResults: z.number().int().min(1).max(50).optional().default(10),
  usedImageIds: z.array(z.string()).max(100).optional().default([]),
  usedImageUrls: z.array(z.string()).max(500).optional().default([]),
  workspace_id: z.string().uuid().optional(),
});

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
  image?: string;
}

function isDomainBlacklisted(url: string, excludedDomains: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      excludedDomains.some((site) => hostname.includes(site)) ||
      PAYWALL_SITES.some((site) => hostname.includes(site))
    );
  } catch {
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  try {
    // Verify admin access
    const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
    if (authError || !userId) return authError!;

    const body = await req.json();
    const parsed = RequestSchema.parse(body);

    // Get workspace settings
    const workspaceId = parsed.workspace_id || (await getUserWorkspaceId(userId));
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ success: false, error: "No workspace found" }),
        { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = await loadWorkspaceSettings(workspaceId);
    if (!settings) {
      return new Response(
        JSON.stringify({ success: false, error: "Workspace settings not found" }),
        { status: 404, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use workspace's default search query if no query provided
    const searchQuery = parsed.query || settings.default_search_query || settings.industry_vertical;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const TAVILY_API_KEY = await getVaultSecret("TAVILY_API_KEY", serviceClient);
    if (!TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY not configured");
    }

    // Search via Tavily
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const tavilyResponse = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: searchQuery,
        search_depth: "advanced",
        max_results: Math.min(parsed.maxResults * 2, 50),
        include_images: true,
        include_answer: false,
        days: 2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!tavilyResponse.ok) {
      throw new Error(`Tavily API error: ${tavilyResponse.status}`);
    }

    const tavilyData = await tavilyResponse.json();
    const results: TavilySearchResult[] = tavilyData.results || [];

    // Filter out blacklisted and paywall domains (using workspace config)
    const filtered = results.filter((r) => !isDomainBlacklisted(r.url, settings.excluded_domains));

    // Build unified articles
    const usedImageUrls = new Set(parsed.usedImageUrls);
    const fallbackImages = settings.fallback_images.length > 0
      ? settings.fallback_images
      : [
          "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
        ];

    let fallbackIndex = 0;

    const articles = filtered.slice(0, parsed.maxResults).map((result, idx) => {
      let image = result.image || "";

      // Skip if image already used
      if (image && usedImageUrls.has(image)) {
        image = "";
      }

      // Fallback image
      if (!image) {
        image = fallbackImages[fallbackIndex % fallbackImages.length];
        fallbackIndex++;
      }

      if (image) usedImageUrls.add(image);

      return {
        id: `search-${Date.now()}-${idx}`,
        title: result.title,
        url: result.url,
        content: result.content,
        relevanceScore: result.score,
        publishedDate: result.published_date || null,
        source: new URL(result.url).hostname.replace("www.", ""),
        sourceType: "tavily" as const,
        scannedAt: new Date().toISOString(),
        image,
      };
    });

    return new Response(
      JSON.stringify({ success: true, articles, query: searchQuery }),
      { headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search news error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
