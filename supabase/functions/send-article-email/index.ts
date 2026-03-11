import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { openCorsHeaders } from "../_shared/cors.ts";
import { verifyAdminAccess, getUserWorkspaceId } from "../_shared/auth.ts";
import { loadWorkspaceSettings } from "../_shared/workspace-loader.ts";
import { buildArticleEmailHtml } from "../../packages/core/src/templates/email-article.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const ArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  source: z.string().max(200),
  url: z.string().url().max(2000),
  image: z.string().max(2000).optional(),
});

const SecondaryArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
}).optional();

const RequestSchema = z.object({
  to: z.string().email().max(255),
  article: ArticleSchema,
  // Language-neutral: "secondary" is translation (Hebrew for i-HLS, or other language for other workspaces)
  secondaryArticle: SecondaryArticleSchema,
  // Legacy compat
  hebrewArticle: SecondaryArticleSchema,
  sendBothLanguages: z.boolean().optional(),
  workspaceId: z.string().uuid().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: openCorsHeaders });
  }

  const { error: authError, userId } = await verifyAdminAccess(req, openCorsHeaders);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON" }),
      { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ success: false, error: "Validation failed", details: parsed.error.flatten() }),
      { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { to, article, secondaryArticle, hebrewArticle, sendBothLanguages, workspaceId: requestedWsId } = parsed.data;

  // Resolve workspace settings
  const workspaceId = requestedWsId ?? (await getUserWorkspaceId(userId!));
  if (!workspaceId) {
    return new Response(
      JSON.stringify({ success: false, error: "Workspace not found" }),
      { status: 400, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }

  const settings = await loadWorkspaceSettings(workspaceId);

  const fromName = settings.email_sender_name || settings.brand_name;
  const fromEmail = settings.email_from_address || Deno.env.get("EMAIL_FROM") || "news@autopilot.content";
  const from = `${fromName} <${fromEmail}>`;

  // Build primary email (primary language)
  const primaryLang = settings.primary_language === "he" ? "he" : "en";
  const primaryHtml = buildArticleEmailHtml(article, settings, primaryLang);

  // Secondary language (translation)
  // Support both new "secondaryArticle" key and legacy "hebrewArticle" key
  const secondary = secondaryArticle ?? hebrewArticle;

  const emailsSent: string[] = [];
  const errors: string[] = [];

  // Send primary language email
  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject: article.title,
      html: primaryHtml,
    });

    if (error) {
      errors.push(`Primary email error: ${error.message}`);
    } else {
      emailsSent.push(primaryLang);
    }
  } catch (err) {
    errors.push(`Primary email exception: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Send secondary language email if requested and available
  const bilingual = sendBothLanguages ?? settings.bilingual_mode;
  if (bilingual && secondary && settings.supported_languages.length > 1) {
    const secondaryLang = settings.supported_languages.find((l) => l !== primaryLang) ?? "en";
    const secondaryFullArticle = {
      title: secondary.title,
      content: secondary.content,
      source: article.source,
      url: article.url,
      image: article.image,
    };
    const secondaryHtml = buildArticleEmailHtml(secondaryFullArticle, settings, secondaryLang as "he" | "en");

    try {
      const { error } = await resend.emails.send({
        from,
        to: [to],
        subject: secondary.title,
        html: secondaryHtml,
      });

      if (error) {
        errors.push(`Secondary email error: ${error.message}`);
      } else {
        emailsSent.push(secondaryLang);
      }
    } catch (err) {
      errors.push(`Secondary email exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[send-article-email] workspace=${workspaceId} to=${to} sent=${emailsSent.join(",")} errors=${errors.length}`);

  if (emailsSent.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "All email sends failed", details: errors }),
      { status: 200, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, emailsSent, errors: errors.length > 0 ? errors : undefined }),
    { status: 200, headers: { ...openCorsHeaders, "Content-Type": "application/json" } }
  );
});
