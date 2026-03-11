import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { resolveWorkspaceByOrigin, type WorkspaceSettings } from "../_shared/workspace-loader.ts";

/**
 * Generalized chatbot query function.
 * Reads system prompt, allowed origins, and brand name from workspace_settings.
 * Resolves workspace by matching origin header to chatbot_allowed_origins.
 */

const RequestSchema = z.object({
  message: z.string().min(1).max(500),
  sessionId: z.string().min(1).max(100),
  language: z.enum(["he", "en"]).default("he"),
  messageCount: z.number().int().min(0).max(100).default(0),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(1000),
    })
  ).max(20).default([]),
});

// IP hashing with configurable salt
async function hashIP(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

// deno-lint-ignore no-explicit-any
async function checkRateLimit(supabase: ReturnType<typeof createClient<any>>, ipHash: string): Promise<{ allowed: boolean }> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await supabase
    .from("chatbot_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("window_start", oneDayAgo.toISOString());

  return { allowed: (count ?? 0) < 3 };
}

// deno-lint-ignore no-explicit-any
async function recordRateLimit(supabase: ReturnType<typeof createClient<any>>, ipHash: string) {
  await supabase.from("chatbot_rate_limits").insert({ ip_hash: ipHash });
  // Cleanup old entries
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  supabase.from("chatbot_rate_limits").delete().lt("window_start", oneDayAgo.toISOString()).then(() => {});
}

interface ChatArticle {
  title: string;
  url: string;
  content: string;
  publishedDate: string | null;
}

async function searchPerplexity(
  query: string,
  apiKey: string,
  settings: WorkspaceSettings
): Promise<ChatArticle[]> {
  console.log(`[Perplexity] Searching: ${query}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    // Use workspace-specific researcher prompt instead of hardcoded "defense-tech"
    const researcherPrompt = `You are a ${settings.industry_vertical} news researcher for ${settings.brand_name}. Find real, high-quality, recent news articles. NO YouTube, NO generic video links, NO paywalls. For each article, write a numbered entry with its title on the first line and a 1-2 sentence summary below it.`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: researcherPrompt },
          {
            role: "user",
            content: `Find the 10 most relevant and recent news articles (last 48 hours) about: ${query}. (NO YOUTUBE, NO VIDEOS, NO PAYWALLS). List them numbered 1-10, each with title and a brief summary.`,
          },
        ],
        search_recency_filter: "day",
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Perplexity] API error ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const citations: string[] = data.citations || [];

    if (citations.length === 0) return [];

    const today = new Date().toISOString().split("T")[0];

    // Universal blacklisted domains (video sites, paywalls)
    const BLACKLISTED_DOMAINS = [
      "youtube.com", "youtu.be", "vimeo.com", "tiktok.com",
      "wsj.com", "bloomberg.com", "ft.com", "nytimes.com",
    ];

    const validArticles: ChatArticle[] = [];

    for (let i = 0; i < citations.length; i++) {
      const url = citations[i];
      const cleanUrl = url.toLowerCase();

      if (BLACKLISTED_DOMAINS.some(domain => cleanUrl.includes(domain))) continue;

      const citIdx = i + 1;
      const numberedPattern = new RegExp(`${citIdx}[.)\\s]+([^\\n]{5,150})(?:\\n([^\\n]{5,300}))?`, "i");
      const numberedMatch = numberedPattern.exec(content);
      const refPattern = new RegExp(`\\[${citIdx}\\]([^\\[]{10,300})`, "g");
      const refMatch = refPattern.exec(content);

      let title = "";
      let snippet = "";

      if (numberedMatch) {
        title = numberedMatch[1].trim().replace(/\*\*/g, "");
        snippet = (numberedMatch[2] || "").trim();
      } else if (refMatch) {
        const text = refMatch[1].trim();
        title = text.split(/[.!?\n]/)[0]?.trim() || "";
        snippet = text;
      }

      // Generic fallback title (no "Defense News" hardcoding)
      if (!title || title.length < 5) {
        try {
          title = `News from ${new URL(url).hostname.replace("www.", "")}`;
        } catch {
          title = `News #${citIdx}`;
        }
      }

      validArticles.push({
        title: title.substring(0, 150),
        url,
        content: snippet.substring(0, 300) || title,
        publishedDate: today,
      });

      if (validArticles.length >= 5) break;
    }

    return validArticles;
  } catch (err) {
    clearTimeout(timeout);
    console.error("[Perplexity] Error:", err);
    return [];
  }
}

/**
 * Build chatbot system prompt from workspace settings.
 */
function buildChatbotPrompt(settings: WorkspaceSettings): string {
  if (settings.chatbot_system_prompt) return settings.chatbot_system_prompt;

  const topics = settings.chatbot_topics.map(t => t.labelEn).join(", ");

  return `You are the ${settings.brand_name} news assistant. Your ONLY job is to trigger a news search.

ALLOWED TOPICS: ${topics || settings.industry_vertical}.

STRICT OUTPUT RULES:
1. Output MAXIMUM 10 words of visible text.
2. Do NOT explain, summarize, list, or teach.
3. Your visible text = one short acknowledgment only.
4. Always end with [SEARCH_TOPICS: english search query here]

If out of scope, politely redirect to allowed topics.
LANGUAGE: Match the user's language exactly.
NO [SEARCH_TOPICS] tag for out-of-scope messages.`;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      },
    });
  }

  // Resolve workspace from origin
  const settings = origin ? await resolveWorkspaceByOrigin(origin) : null;
  const corsHeaders = getCorsHeaders(origin, settings);

  // Block non-allowed origins
  if (origin && settings && !isOriginAllowed(origin, settings)) {
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // If no workspace found for origin, deny (unless localhost)
  if (!settings && origin && !origin.startsWith("http://localhost")) {
    return new Response(
      JSON.stringify({ success: false, error: "No workspace configured for this domain" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, language, messageCount, conversationHistory } = parseResult.data;

    // Session limit
    if (messageCount >= 20) {
      return new Response(
        JSON.stringify({
          success: true,
          reply: language === "he"
            ? "נראה שהיית פעיל מאוד! הירשם לניוזלטר שלנו לעדכונים שוטפים."
            : "You've been very active! Subscribe to our newsletter for regular updates.",
          showSubscribeForm: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const salt = settings?.workspace_id || "default-salt";
    const ipHash = await hashIP(ip, salt);

    const rateCheck = await checkRateLimit(supabase, ipHash);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "rate_limited",
          reply: language === "he"
            ? "ניצלת את המכסה היומית. נסה שוב מחר!"
            : "Daily limit reached. Try again tomorrow!",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AI call
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!aiApiKey) throw new Error("AI API key not configured");

    // Use workspace-specific chatbot prompt
    const systemPrompt = settings ? buildChatbotPrompt(settings) : "You are a news assistant.";

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `${message}\n\n---\nSYSTEM REMINDER: Output a short acknowledgment (max 10 words) + [SEARCH_TOPICS: keywords].`,
      },
    ];

    const aiController = new AbortController();
    const aiTimeout = setTimeout(() => aiController.abort(), 15000);

    const aiResponse = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
        max_tokens: 80,
      }),
      signal: aiController.signal,
    });

    clearTimeout(aiTimeout);
    if (!aiResponse.ok) throw new Error(`AI API error: ${aiResponse.status}`);

    const aiData = await aiResponse.json();
    const rawReply: string = aiData.choices?.[0]?.message?.content || "";

    // Extract search topics
    const topicsMatch = rawReply.match(/\[SEARCH_TOPICS:\s*([^\]]+)\]/);
    const detectedTopics = topicsMatch ? topicsMatch[1].split(",").map((t: string) => t.trim()).filter(Boolean) : [];
    let cleanReply = rawReply.replace(/\[SEARCH_TOPICS:[^\]]*\]/g, "").trim();

    // Search Perplexity
    let articles: ChatArticle[] = [];
    if (detectedTopics.length > 0 && perplexityKey && settings) {
      await recordRateLimit(supabase, ipHash);
      articles = await searchPerplexity(detectedTopics.join(", "), perplexityKey, settings);

      if (articles.length > 0) {
        const followUp = language === "he"
          ? "\n\n1. לחפש עוד כתבות?\n2. רוצה להצטרף לניוזלטר יומי?"
          : "\n\n1. Search for more articles?\n2. Subscribe to our daily newsletter?";
        cleanReply += followUp;
      }
    }

    const shouldOfferSubscribe = articles.length > 0 && messageCount > 0 && messageCount % 3 === 0;

    return new Response(
      JSON.stringify({
        success: true,
        reply: cleanReply,
        articles: articles.length > 0 ? articles : undefined,
        showSubscribeForm: shouldOfferSubscribe || undefined,
        detectedTopics: detectedTopics.length > 0 ? detectedTopics : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("chatbot-query error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
