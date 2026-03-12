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

    const content = (body.content as string) || "";
    const currentTitle = (body.currentTitle as string) || "";
    const language = (body.language as string) || "english";

    if (!currentTitle && !content) {
      return json({ success: false, error: "Missing content or title" }, 400);
    }

    const workspaceId = await getUserWorkspaceId(userId!);
    if (!workspaceId) return json({ success: false, error: "No workspace found" }, 404);

    const settings = await loadWorkspaceSettings(workspaceId);
    const aiGatewayUrl = Deno.env.get("OPENAI_API_BASE") || "https://api.openai.com";
    const aiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!aiApiKey) {
      return json({ success: false, error: "AI not configured" }, 500);
    }

    const isHebrew = language === "hebrew";
    const systemPrompt = isHebrew
      ? "אתה עורך כותרות מיומן. צור 5 כותרות חלופיות קצרות וממוקדות SEO. כל כותרת עד 60 תווים. כתוב ישירות, ללא הסברים. תן JSON עם מפתח 'titles' כמערך מחרוזות."
      : "You are an expert headline writer. Generate 5 alternative short, SEO-focused headlines. Each headline under 60 characters. Be direct. Return JSON with key 'titles' as an array of strings.";

    const userPrompt = isHebrew
      ? `כותרת נוכחית: "${currentTitle}"\n\nתוכן (חלקי): ${content.substring(0, 400)}\n\nצור 5 כותרות אלטרנטיביות:`
      : `Current title: "${currentTitle}"\n\nContent (excerpt): ${content.substring(0, 400)}\n\nGenerate 5 alternative headlines:`;

    const aiRes = await fetch(`${aiGatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      return json({ success: false, error: "AI request failed" }, 500);
    }

    const aiData = await aiRes.json() as { choices: Array<{ message: { content: string } }> };
    const rawContent = aiData.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(rawContent);
    const titles: string[] = parsed.titles || [];

    return json({ success: true, titles });
  } catch (err) {
    console.error("generate-alternative-titles error:", err);
    return json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      500
    );
  }
});
