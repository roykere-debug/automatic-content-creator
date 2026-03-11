import type { KeywordConfig } from "../config/types.ts";

/**
 * Article relevance scoring based on workspace keyword configuration.
 * Replaces the hardcoded STRONG/WEAK/TECH keyword lists.
 */
export function scoreArticleRelevance(
  title: string,
  content: string,
  keywords: KeywordConfig,
  excludedKeywords: string[]
): { score: number; matchedKeywords: string[]; excluded: boolean } {
  const text = `${title} ${content}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // Check exclusions first
  for (const excluded of excludedKeywords) {
    if (text.includes(excluded.toLowerCase())) {
      return { score: 0, matchedKeywords: [], excluded: true };
    }
  }

  let score = 0;

  // Strong keywords (highest weight)
  for (const keyword of keywords.strong) {
    if (text.includes(keyword.toLowerCase())) {
      score += 3;
      matchedKeywords.push(keyword);
    }
  }

  // Tech/industry keywords (medium weight)
  for (const keyword of keywords.tech) {
    if (text.includes(keyword.toLowerCase())) {
      score += 2;
      matchedKeywords.push(keyword);
    }
  }

  // Weak keywords (low weight)
  for (const keyword of keywords.weak) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
      matchedKeywords.push(keyword);
    }
  }

  return { score, matchedKeywords, excluded: false };
}

/**
 * Check if an article passes the minimum relevance threshold.
 */
export function passesRelevanceFilter(
  title: string,
  content: string,
  keywords: KeywordConfig,
  excludedKeywords: string[],
  minScore: number = 2
): boolean {
  const { score, excluded } = scoreArticleRelevance(title, content, keywords, excludedKeywords);
  return !excluded && score >= minScore;
}
