import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings } from "../_shared/workspace-loader.ts";

/**
 * Generalized article translation function.
 * Reads system prompt and brand name from workspace_settings.
 * No hardcoded i-HLS / defense-tech references.
 */

const RequestSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  url: z.string().url().max(2000),
  source: z.string().max(200),
  workspace_id: z.string().uuid().optional(),
});

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  try {
    const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
    if (authError || !userId) return authError!;

    const body = await req.json();
    const parseResult = RequestSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input", details: parseResult.error.errors }),
        { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { title, content, url, source, workspace_id } = parseResult.data;

    const workspaceId = workspace_id || (await getUserWorkspaceId(userId));
    const settings = workspaceId ? await loadWorkspaceSettings(workspaceId) : null;

    // Build translation system prompt from workspace settings
    const brandName = settings?.brand_name || "AutoPilot Content";
    const industryVertical = settings?.industry_vertical || "technology";
    const secondaryLanguage = settings?.supported_languages?.[1] || "en";
    const primaryLanguage = settings?.primary_language || "en";

    const systemPrompt = `You are a writer for ${brandName}, a ${industryVertical} news publication.

Goal: Write TWO engaging, readable articles — one in ${primaryLanguage.toUpperCase()} and one in ${secondaryLanguage.toUpperCase()} — based on the input data. Each article should be 300-500 words.

### ACCURACY REQUIREMENTS (CRITICAL):
- ONLY use facts, numbers, names, dates, and details from the original article
- DO NOT invent, fabricate, or assume ANY information not in the source
- When in doubt, be vague rather than specific

### CONTENT INSTRUCTIONS:
- Focus on the technology, product, or news itself
- Article structure: problem/challenge → how solved → additional features → context
- Use short paragraphs and clear sentences
- Sound like a human journalist, NOT like AI

### HEADLINE RULES:
- Compelling, curiosity-inducing headlines
- ONLY include numbers/specifics from the source
- Examples: "The 3 Reasons Why...", "Why Every [industry] Company Will Want This"

### OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "primaryTitle": "Headline in ${primaryLanguage}",
  "primaryContent": "Full article in ${primaryLanguage} (300-500 words)",
  "secondaryTitle": "Headline in ${secondaryLanguage}",
  "secondaryContent": "Full article in ${secondaryLanguage} (300-500 words)"
}

The secondary article is NOT a translation — it's an independent article written naturally for that language's audience.
Every fact must be traceable to the original source.`;

    console.log(`[translate-article] Processing: ${title.substring(0, 50)}`);

    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiApiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!aiApiKey) throw new Error("AI API key not configured");

    const userPrompt = `INPUT DATA:
Original Title: ${title}
Original Content: ${content}
Source: ${source}
URL: ${url}

Write two professional articles following the instructions.`;

    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") ?? "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    // Parse JSON response
    let articles;
    try {
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\n?/, "").replace(/\n?```$/, "");
      articles = JSON.parse(cleaned);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          primaryArticle: { title: articles.primaryTitle, content: articles.primaryContent },
          secondaryArticle: { title: articles.secondaryTitle, content: articles.secondaryContent },
          // Legacy compatibility keys
          englishArticle: { title: articles.primaryTitle, content: articles.primaryContent },
          hebrewArticle: { title: articles.secondaryTitle, content: articles.secondaryContent },
        },
      }),
      { status: 200, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("translate-article error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
