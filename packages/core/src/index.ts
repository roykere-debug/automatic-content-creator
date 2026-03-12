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
} from "./config/types";

export {
  PAYWALL_SITES,
  DEFAULT_FALLBACK_IMAGES,
  DEFAULT_THEME_COLORS,
  DEFAULT_CHATBOT_GREETING,
  RATE_LIMITS,
  AI_DEFAULTS,
} from "./config/defaults";

// Prompts
export { buildArticleSystemPrompt } from "./prompts/article-generation";
export { buildChatbotSystemPrompt, buildPerplexityPrompt } from "./prompts/chatbot";
export { buildTranslationPrompt } from "./prompts/translation";

// Services
export { hashIP, isDomainBlacklisted, normalizeUrl } from "./services/rate-limiter";
export { scoreArticleRelevance, passesRelevanceFilter } from "./services/keyword-filter";
export { callAiCompletion, getAiGatewayUrl, getAiApiKey } from "./services/ai-gateway";

// Templates
export { buildArticleEmailHtml } from "./templates/email-article";
