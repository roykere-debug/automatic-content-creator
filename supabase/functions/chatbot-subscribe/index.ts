import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { resolveWorkspaceByOrigin } from "../_shared/workspace-loader.ts";

/**
 * Generalized chatbot subscribe function.
 * Reads allowed origins and brand name from workspace_settings.
 * No hardcoded i-HLS references.
 */

const SubscribeSchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  name: z.string().max(100).optional(),
  interests: z.array(z.string().max(50)).max(10).default([]),
  sessionId: z.string().min(1).max(100),
  language: z.enum(["he", "en"]).default("he"),
  website: z.string().max(0).optional(), // Honeypot
});

async function hashIP(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

// deno-lint-ignore no-explicit-any
async function checkSubscribeRateLimit(supabase: ReturnType<typeof createClient<any>>, ipHash: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const { count } = await supabase
    .from("chatbot_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash + "-subscribe")
    .gte("window_start", oneHourAgo.toISOString());

  if ((count ?? 0) >= 3) return false;

  await supabase.from("chatbot_rate_limits").insert({ ip_hash: ipHash + "-subscribe" });
  return true;
}

serve(async (req) => {
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

  if (origin && settings && !isOriginAllowed(origin, settings)) {
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = SubscribeSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, interests, sessionId, language, website } = parseResult.data;

    // Honeypot check
    if (website && website.length > 0) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const salt = settings?.workspace_id || "default-salt";
    const ipHash = await hashIP(ip, salt);

    const allowed = await checkSubscribeRateLimit(supabase, ipHash);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "rate_limited",
          message: language === "he"
            ? "הגעת למגבלת ניסיונות הרשמה. נסה שוב מאוחר יותר."
            : "Too many subscription attempts. Please try again later.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadySubscribed: true,
          message: language === "he" ? "כתובת המייל כבר רשומה!" : "This email is already subscribed!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert subscriber (with workspace_id if available)
    const insertData: Record<string, unknown> = {
      email,
      name: name || null,
      interests,
      language,
      source: "chatbot",
      session_id: sessionId,
      ip_hash: ipHash,
      confirmed: false,
    };

    if (settings?.workspace_id) {
      insertData.workspace_id = settings.workspace_id;
    }

    const { error: insertError } = await supabase.from("newsletter_subscribers").insert(insertData);

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            success: true,
            alreadySubscribed: true,
            message: language === "he" ? "כתובת המייל כבר רשומה!" : "Already subscribed!",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    // Use workspace brand name in success message
    const brandName = settings?.brand_name || "our";
    const successMessage = language === "he"
      ? `נרשמת בהצלחה לניוזלטר של ${brandName}!`
      : `Successfully subscribed to ${brandName} newsletter!`;

    return new Response(
      JSON.stringify({ success: true, message: successMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("chatbot-subscribe error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
