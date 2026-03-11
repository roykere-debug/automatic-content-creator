// Config
export type {
  WorkspaceSettings,
  WorkspaceSettingsUpdate,
  RssFeed,
  ChatbotTopic,
  ChatbotGreeting,
  ThemeColors,
  KeywordConfig,
  CategoryMapEntry,
} from "./config/types.ts";

export {
  PAYWALL_SITES,
  DEFAULT_FALLBACK_IMAGES,
  DEFAULT_THEME_COLORS,
  DEFAULT_CHATBOT_GREETING,
  RATE_LIMITS,
  AI_DEFAULTS,
} from "./config/defaults.ts";

// Prompts
export { buildArticleSystemPrompt } from "./prompts/article-generation.ts";
export { buildChatbotSystemPrompt, buildPerplexityPrompt } from "./prompts/chatbot.ts";
export { buildTranslationPrompt } from "./prompts/translation.ts";

// Services
export { hashIP, isDomainBlacklisted, normalizeUrl } from "./services/rate-limiter.ts";
export { scoreArticleRelevance, passesRelevanceFilter } from "./services/keyword-filter.ts";
export { callAiCompletion, getAiGatewayUrl, getAiApiKey } from "./services/ai-gateway.ts";

// Templates
export { buildArticleEmailHtml } from "./templates/email-article.ts";
