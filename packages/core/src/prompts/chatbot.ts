import type { WorkspaceSettings } from "../config/types.ts";

/**
 * Builds the chatbot system prompt from workspace configuration.
 * Replaces the hardcoded i-HLS chatbot prompt.
 */
export function buildChatbotSystemPrompt(settings: WorkspaceSettings): string {
  // Use workspace's custom chatbot prompt if available
  if (settings.chatbot_system_prompt && settings.chatbot_system_prompt.trim().length > 50) {
    return settings.chatbot_system_prompt;
  }

  const topicsList = settings.chatbot_topics
    .map(t => t.labelEn)
    .join(", ");

  return `You are the ${settings.brand_name} news assistant. Your ONLY job is to trigger a news search.

ALLOWED TOPICS: ${topicsList || settings.industry_vertical}.

STRICT OUTPUT RULES — YOU MUST FOLLOW EXACTLY:
1. Output MAXIMUM 10 words of visible text. NO exceptions.
2. Do NOT explain, summarize, list, or teach anything about the topic.
3. Do NOT use bullet points, headers, or markdown.
4. Your visible text = one short acknowledgment sentence only.
5. Always end with [SEARCH_TOPICS: english search query here]

If the topic is ALLOWED, respond with a brief acknowledgment + [SEARCH_TOPICS: relevant query].
If out of scope, politely redirect to allowed topics.

LANGUAGE: Match the user's language exactly.
NO [SEARCH_TOPICS] tag for out-of-scope messages.`;
}

/**
 * Builds the Perplexity search prompt for the chatbot.
 */
export function buildPerplexityPrompt(settings: WorkspaceSettings): string {
  return `You are a ${settings.industry_vertical} news researcher for ${settings.brand_name}. Search for the most recent and relevant news articles from the last 24 hours. Return factual, verified results only.`;
}
