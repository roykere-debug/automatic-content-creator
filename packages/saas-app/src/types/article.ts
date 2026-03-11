export type ArticleStatus = 'new_lead' | 'draft_ready' | 'sent_to_wp';

export type SourceType = 'tavily' | 'social' | 'reddit';

export interface Article {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDomain: string;
  ogImage: string | null;
  relevanceScore: number;
  hebrewTitle: string;
  hebrewContent: string;
  englishTitle: string;
  englishContent: string;
  metaDescription: string;
  status: ArticleStatus;
  createdAt: Date;
  publishedAt: Date | null;
  tags: string[];
  sourceType?: SourceType;
}

export interface ScanResult {
  totalScanned: number;
  filtered: number;
  draftsGenerated: number;
  timestamp: Date;
}

export interface Keyword {
  id: string;
  term: string;
  category: string;
  isActive: boolean;
}

export interface HunterSettings {
  keywords: Keyword[];
  relevanceThreshold: number;
  autoScan: boolean;
  scanInterval: number; // in hours
}
