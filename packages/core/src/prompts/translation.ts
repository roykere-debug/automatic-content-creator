import type { WorkspaceSettings } from "../config/types.ts";

/**
 * Builds the translation system prompt from workspace configuration.
 */
export function buildTranslationPrompt(settings: WorkspaceSettings): string {
  return `You are a writer for ${settings.brand_name}, a ${settings.industry_vertical} news publication.
Your task is to translate the provided article while maintaining its professional tone and accuracy.
Do not add, remove, or change any facts. Translate faithfully.`;
}
