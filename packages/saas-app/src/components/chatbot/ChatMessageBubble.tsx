import { Bot } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import type { ChatMessage, ChatLanguage } from "./types";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  language: ChatLanguage;
}

export function ChatMessageBubble({ message, language }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const isHebrew = language === "he";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-tactical-green/20 border border-tactical-green/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-tactical-green" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${isUser
              ? "bg-tactical-green/20 border border-tactical-green/30 text-foreground rounded-tr-sm"
              : "bg-white/5 border border-white/10 text-foreground/90 rounded-tl-sm"
            }`}
          dir={isHebrew ? "rtl" : "ltr"}
        >
          {message.content}
        </div>

        {/* Article cards */}
        {message.articles && message.articles.length > 0 && (
          <div className="w-full mt-1">
            <p className="text-xs text-muted-foreground/60 mb-1.5 px-1">
              {isHebrew ? "הכתבות האחרונות:" : "Latest articles:"}
            </p>
            {message.articles.map((article, i) => (
              <ArticleCard key={i} index={i + 1} article={article} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/40 px-1">
          {message.timestamp.toLocaleTimeString(isHebrew ? "he-IL" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
