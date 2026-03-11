/**
 * AutoPilot Content — Universal Defaults
 *
 * Constants that apply across ALL workspaces regardless of vertical.
 * Industry-specific content belongs in workspace_settings.
 */

/**
 * Paywall/subscription sites to always exclude.
 * These are universal — no vertical needs paywalled content.
 */
export const PAYWALL_SITES = [
  "wsj.com",
  "ft.com",
  "economist.com",
  "bloomberg.com",
  "nytimes.com",
  "washingtonpost.com",
  "thetimes.co.uk",
  "telegraph.co.uk",
  "haaretz.com",
  "theinformation.com",
  "businessinsider.com",
  "seekingalpha.com",
  "barrons.com",
  "latimes.com",
  "fortune.com",
  "pitchbook.com",
] as const;

/**
 * Default fallback images (generic tech/business — not defense-specific).
 */
export const DEFAULT_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop",
] as const;

/**
 * Default theme colors (neutral professional — not military-themed).
 */
export const DEFAULT_THEME_COLORS = {
  primary: "#3b82f6",      // Blue
  primaryGlow: "rgba(59, 130, 246, 0.2)",
  accent: "#10b981",       // Emerald
  accentGlow: "rgba(16, 185, 129, 0.2)",
  background: "#0f172a",   // Slate-900
  surface: "#1e293b",      // Slate-800
  foreground: "#e2e8f0",   // Slate-200
  cardBg: "#1e293b",       // Slate-800
} as const;

/**
 * Default chatbot greeting messages.
 */
export const DEFAULT_CHATBOT_GREETING = {
  he: "שלום! אני העוזר שלך לחדשות וטכנולוגיה. על מה תרצה לשמוע?",
  en: "Hi! I'm your news assistant. What would you like to hear about?",
} as const;

/**
 * Rate limiting defaults.
 */
export const RATE_LIMITS = {
  chatbot_queries_per_day: 3,
  chatbot_max_messages_per_session: 20,
  subscribe_attempts_per_hour: 3,
  max_message_length: 500,
} as const;

/**
 * AI model defaults.
 */
export const AI_DEFAULTS = {
  article_model: "google/gemini-2.5-pro",
  chatbot_model: "google/gemini-2.5-flash",
  image_query_model: "google/gemini-2.5-flash",
  article_temperature: 0.7,
  chatbot_temperature: 0.3,
  article_max_tokens: 2000,
  chatbot_max_tokens: 80,
} as const;
