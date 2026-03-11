export interface ChatArticle {
  title: string;
  url: string;
  content: string;
  publishedDate: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  articles?: ChatArticle[];
  timestamp: Date;
}

export type ChatLanguage = "he" | "en";
