import type { WorkspaceSettings } from "../config/types.ts";

interface ArticleEmailData {
  title: string;
  content: string;
  source: string;
  url: string;
  image?: string;
}

/**
 * Builds the article email HTML from workspace brand config.
 * Replaces the hardcoded i-HLS military-themed email template.
 */
export function buildArticleEmailHtml(
  article: ArticleEmailData,
  settings: WorkspaceSettings,
  language: "he" | "en" = "en"
): string {
  const { brand_name, theme_colors, dashboard_url } = settings;
  const isRtl = language === "he";
  const dir = isRtl ? "rtl" : "ltr";
  const readMore = isRtl ? "קרא עוד" : "Read Full Article";
  const poweredBy = isRtl ? `מונע על ידי ${brand_name}` : `Powered by ${brand_name}`;

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:${theme_colors.background};font-family:'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,${theme_colors.primary},${theme_colors.accent});padding:20px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">${brand_name}</h1>
      </td>
    </tr>

    <!-- Hero Image -->
    ${article.image ? `
    <tr>
      <td>
        <img src="${article.image}" alt="${article.title}" style="width:100%;height:auto;display:block;" />
      </td>
    </tr>
    ` : ""}

    <!-- Content -->
    <tr>
      <td style="background:${theme_colors.surface};padding:24px;color:${theme_colors.foreground};">
        <h2 style="color:#fff;font-size:20px;margin:0 0 16px 0;line-height:1.4;">${article.title}</h2>
        <div style="font-size:15px;line-height:1.7;color:${theme_colors.foreground};">
          ${article.content}
        </div>
      </td>
    </tr>

    <!-- Source -->
    <tr>
      <td style="background:${theme_colors.surface};padding:0 24px 16px;">
        <p style="color:#888;font-size:13px;margin:0;">
          Source: <a href="${article.url}" style="color:${theme_colors.primary};">${article.source}</a>
        </p>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="background:${theme_colors.surface};padding:0 24px 24px;text-align:center;">
        <a href="${article.url}" style="display:inline-block;background:${theme_colors.primary};color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;">
          ${readMore}
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:${theme_colors.background};padding:16px;text-align:center;">
        <p style="color:#666;font-size:12px;margin:0;">${poweredBy}</p>
        ${dashboard_url ? `<p style="margin:4px 0 0;"><a href="${dashboard_url}" style="color:${theme_colors.primary};font-size:12px;">Dashboard</a></p>` : ""}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
