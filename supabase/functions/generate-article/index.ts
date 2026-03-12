import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings } from "../_shared/workspace-loader.ts";

/**
 * Generalized article generation edge function.
 * Reads system prompt, AI gateway, and WordPress config from workspace_settings.
 * No hardcoded i-HLS or defense-tech content.
 */

const articleTool = {
  type: "function",
  function: {
    name: "create_bilingual_article",
    description: "Create a bilingual article with two language versions",
    parameters: {
      type: "object",
      properties: {
        primary: {
          type: "object",
          properties: {
            title: { type: "string", description: "SEO optimized article title, max 60 characters" },
            content: { type: "string", description: "Full article content, 400-600 words" },
            keywords: { type: "array", items: { type: "string" }, description: "5-7 SEO keywords" },
            metaDescription: { type: "string", description: "Short SEO keyword phrase, 3-6 words" },
          },
          required: ["title", "content", "keywords", "metaDescription"],
        },
        secondary: {
          type: "object",
          properties: {
            title: { type: "string", description: "SEO optimized article title in secondary language, max 60 characters" },
            content: { type: "string", description: "Full article content in secondary language, 400-600 words" },
            keywords: { type: "array", items: { type: "string" }, description: "5-7 SEO keywords in secondary language" },
            metaDescription: { type: "string", description: "Short SEO keyword phrase in secondary language, 3-6 words" },
          },
          required: ["title", "content", "keywords", "metaDescription"],
        },
        suggestedCategoryTerms: {
          type: "array",
          items: { type: "string" },
          description: "3-5 general topic terms for WordPress category matching",
        },
      },
      required: ["primary", "secondary", "suggestedCategoryTerms"],
      additionalProperties: false,
    },
  },
};

// Fetch WordPress categories from workspace config
async function fetchWordPressCategories(
  wpUrl: string,
  wpUsername: string,
  wpPassword: string
): Promise<Array<{ id: number; name: string; slug: string }>> {
  try {
    if (!wpUrl || !wpUsername || !wpPassword) return [];

    const auth = btoa(`${wpUsername}:${wpPassword}`);
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=100`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) return [];

    // deno-lint-ignore no-explicit-any
    const categories = await response.json();
    // deno-lint-ignore no-explicit-any
    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
    }));
  } catch (error) {
    console.error("Error fetching WP categories:", error);
    return [];
  }
}

function matchCategoriesToWP(
  suggestedTerms: string[],
  wpCategories: Array<{ id: number; name: string; slug: string }>
): string[] {
  const matched: string[] = [];

  for (const term of suggestedTerms) {
    const termLower = term.toLowerCase();
    const match = wpCategories.find(
      (cat) =>
        cat.name.toLowerCase().includes(termLower) ||
        cat.slug.toLowerCase().includes(termLower) ||
        termLower.includes(cat.name.toLowerCase()) ||
        termLower.includes(cat.slug.toLowerCase())
    );

    if (match && !matched.includes(match.name)) {
      matched.push(match.name);
    }
  }

  return matched;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  try {
    // Verify admin access
    const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
    if (authError || !userId) return authError!;

    // Get workspace
    const body = await req.json();
    const workspaceId = body.workspace_id || (await getUserWorkspaceId(userId));
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "No workspace found for user" }),
        { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const settings = await loadWorkspaceSettings(workspaceId);
    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Workspace settings not found" }),
        { status: 404, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url, title, source, correctionNotes, previousPrimary, previousSecondary } = body;

    if (!url || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: url, title" }),
        { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get AI config from environment
    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!aiApiKey) {
      throw new Error("No AI API key configured");
    }

    // Fetch the original article content
    let articleContent = "";
    try {
      const pageResponse = await fetch(url, {
        headers: {
          "User-Agent": `Mozilla/5.0 (compatible; ${settings.brand_name}-Bot/1.0)`,
        },
      });
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        articleContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .substring(0, 3000);
      }
    } catch {
      console.log("Could not fetch article content, proceeding with title only");
    }

    // Build user prompt
    const userPrompt =
      correctionNotes && previousPrimary && previousSecondary
        ? `You are editing an existing article. Apply ONLY the corrections below.

ORIGINAL SOURCE ARTICLE:
Title: ${title}
Publication: ${source}
URL: ${url}
${articleContent ? `\nFull content:\n${articleContent}` : ""}

EDITOR'S CORRECTIONS:
${correctionNotes}

CURRENT PRIMARY VERSION:
Title: ${previousPrimary.title}
Content: ${previousPrimary.content}

CURRENT SECONDARY VERSION:
Title: ${previousSecondary.title}
Content: ${previousSecondary.content}

Rules:
1. Apply ALL corrections from the editor
2. ONLY use information from the ORIGINAL SOURCE ARTICLE
3. Keep structure synchronized between both versions
4. Write 400-600 words per article
5. Suggest 3-5 category terms`
        : `Create TWO COMPLETE professional articles about the following news item.

Source article information:
- Original title: ${title}
- Source publication: ${source}
- Original URL: ${url}
${source ? `\nInclude source attribution when citing information from this source.` : ""}
${articleContent ? `\nOriginal article content:\n${articleContent}` : ""}

Instructions:
1. Dedicate at least one paragraph to the company background
2. Cover the deal details thoroughly
3. Explain the technology
4. Write 400-600 words per version
5. Meta description: short keyword phrase (3-6 words)
6. Suggest 3-5 category terms`;

    // Fetch WordPress categories for matching
    const wpCategories = await fetchWordPressCategories(
      settings.wordpress_url,
      settings.wordpress_username,
      settings.wordpress_app_password
    );

    // Call AI
    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "gemini-2.5-pro",
        messages: [
          { role: "system", content: settings.system_prompt },
          { role: "user", content: userPrompt },
        ],
        temperature: correctionNotes ? 0.3 : 0.7,
        tools: [articleTool],
        tool_choice: { type: "function", function: { name: "create_bilingual_article" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const articles = JSON.parse(toolCall.function.arguments);

    // Match categories
    const suggestedTerms = articles.suggestedCategoryTerms || [];
    const suggestedCategories = matchCategoriesToWP(suggestedTerms, wpCategories);

    // Return with language-neutral keys (primary/secondary instead of hebrew/english)
    const result = {
      primary: articles.primary,
      secondary: articles.secondary,
      suggestedCategories,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...openCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate article error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
