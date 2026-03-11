/**
 * AutoPilot Content — Workspace Settings Types
 * All configuration that was previously hardcoded is now per-workspace.
 */

export interface RssFeed {
  name: string;
  url: string;
  priority: 1 | 2;
}

export interface ChatbotTopic {
  key: string;
  labelHe: string;
  labelEn: string;
  emoji: string;
}

export interface ChatbotGreeting {
  he: string;
  en: string;
}

export interface ThemeColors {
  primary: string;
  primaryGlow: string;
  accent: string;
  accentGlow: string;
  background: string;
  surface: string;
  foreground: string;
  cardBg: string;
}

export interface KeywordConfig {
  strong: string[];
  weak: string[];
  tech: string[];
}

export interface CategoryMapEntry {
  keywords: string[];
  categories: string[];
}

export interface WorkspaceSettings {
  workspace_id: string;

  // Branding
  brand_name: string;
  brand_tagline: string;
  brand_logo_url: string | null;
  industry_vertical: string;

  // WordPress
  wordpress_url: string;
  wordpress_username: string;
  wordpress_app_password: string;

  // Content Discovery
  scan_keywords: string[];
  default_search_query: string | null;
  excluded_keywords: string[];
  excluded_domains: string[];
  priority_sources: string[];
  trusted_domains: string[];
  rss_feeds: RssFeed[];
  keywords: KeywordConfig;

  // WordPress Categories
  default_categories: string[];
  category_blacklist: string[];
  category_map: Record<string, string[]>;
  always_include_category: string | null;

  // AI
  system_prompt: string;

  // Chatbot
  chatbot_system_prompt: string | null;
  chatbot_topics: ChatbotTopic[];
  chatbot_allowed_origins: string[];
  chatbot_greeting: ChatbotGreeting;

  // Email
  email_sender_name: string;
  email_from_address: string | null;
  dashboard_url: string | null;

  // Images
  fallback_images: string[];
  default_image_query: string;

  // Languages
  supported_languages: string[];
  primary_language: string;
  bilingual_mode: boolean;

  // Theme
  theme_colors: ThemeColors;
}

/**
 * Partial workspace settings for updates
 */
export type WorkspaceSettingsUpdate = Partial<Omit<WorkspaceSettings, 'workspace_id'>>;
