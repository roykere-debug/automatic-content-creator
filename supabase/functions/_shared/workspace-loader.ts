import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Workspace settings as loaded from the database.
 * Mirrors the WorkspaceSettings type from @autopilot-content/core.
 */
export interface WorkspaceSettings {
  workspace_id: string;
  brand_name: string;
  brand_tagline: string;
  brand_logo_url: string | null;
  industry_vertical: string;
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password: string;
  scan_keywords: string[];
  default_search_query: string | null;
  excluded_keywords: string[];
  excluded_domains: string[];
  priority_sources: string[];
  trusted_domains: string[];
  rss_feeds: Array<{ name: string; url: string; priority: number }>;
  keywords: { strong: string[]; weak: string[]; tech: string[] };
  default_categories: string[];
  category_blacklist: string[];
  category_map: Record<string, string[]>;
  always_include_category: string | null;
  system_prompt: string;
  chatbot_system_prompt: string | null;
  chatbot_topics: Array<{ key: string; labelHe: string; labelEn: string; emoji: string }>;
  chatbot_allowed_origins: string[];
  chatbot_greeting: { he: string; en: string };
  email_sender_name: string;
  email_from_address: string | null;
  dashboard_url: string | null;
  fallback_images: string[];
  default_image_query: string;
  supported_languages: string[];
  primary_language: string;
  bilingual_mode: boolean;
  theme_colors: Record<string, string>;
}

// Simple in-memory cache (per function invocation, ~5 min TTL)
const cache = new Map<string, { data: WorkspaceSettings; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load workspace settings by workspace_id.
 * Uses service role key for unrestricted access.
 */
export async function loadWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings | null> {
  // Check cache
  const cached = cache.get(workspaceId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("workspace_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) {
    console.error("Failed to load workspace settings:", error?.message);
    return null;
  }

  const settings: WorkspaceSettings = {
    workspace_id: data.workspace_id,
    brand_name: data.brand_name || "AutoPilot",
    brand_tagline: data.brand_tagline || "Content Intelligence",
    brand_logo_url: data.brand_logo_url || null,
    industry_vertical: data.industry_vertical || "general",
    wordpress_url: data.wordpress_url || "",
    wordpress_username: data.wordpress_username || "",
    wordpress_app_password: data.wordpress_app_password || "",
    scan_keywords: data.scan_keywords || [],
    default_search_query: data.default_search_query || null,
    excluded_keywords: data.excluded_keywords || [],
    excluded_domains: data.excluded_domains || [],
    priority_sources: data.priority_sources || [],
    trusted_domains: data.trusted_domains || [],
    rss_feeds: data.rss_feeds || [],
    keywords: data.keywords || { strong: [], weak: [], tech: [] },
    default_categories: data.default_categories || [],
    category_blacklist: data.category_blacklist || [],
    category_map: data.category_map || {},
    always_include_category: data.always_include_category || null,
    system_prompt: data.system_prompt || "",
    chatbot_system_prompt: data.chatbot_system_prompt || null,
    chatbot_topics: data.chatbot_topics || [],
    chatbot_allowed_origins: data.chatbot_allowed_origins || [],
    chatbot_greeting: data.chatbot_greeting || { he: "שלום!", en: "Hi!" },
    email_sender_name: data.email_sender_name || "News",
    email_from_address: data.email_from_address || null,
    dashboard_url: data.dashboard_url || null,
    fallback_images: data.fallback_images || [],
    default_image_query: data.default_image_query || "technology business",
    supported_languages: data.supported_languages || ["en"],
    primary_language: data.primary_language || "en",
    bilingual_mode: data.bilingual_mode ?? false,
    theme_colors: data.theme_colors || {},
  };

  // Cache the result
  cache.set(workspaceId, { data: settings, timestamp: Date.now() });

  return settings;
}

/**
 * Resolve workspace from chatbot origin header.
 * Used by public chatbot functions that don't receive workspace_id explicitly.
 */
export async function resolveWorkspaceByOrigin(origin: string): Promise<WorkspaceSettings | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Use the DB function for efficient lookup
  const { data: workspaceId, error } = await supabase
    .rpc("get_workspace_by_origin", { origin_url: origin });

  if (error || !workspaceId) {
    // Fallback: check if localhost for dev mode
    if (origin.startsWith("http://localhost")) {
      // In dev, return the first workspace
      const { data: firstSettings } = await supabase
        .from("workspace_settings")
        .select("workspace_id")
        .limit(1)
        .single();

      if (firstSettings) {
        return loadWorkspaceSettings(firstSettings.workspace_id);
      }
    }
    return null;
  }

  return loadWorkspaceSettings(workspaceId);
}

/**
 * Get the default workspace ID (for backwards compatibility).
 */
export async function getDefaultWorkspaceId(): Promise<string | null> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data?.id || null;
}
