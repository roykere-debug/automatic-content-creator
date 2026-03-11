import type { ChatArticle } from "./types";

interface ArticleCardProps {
  article: ChatArticle;
  index: number;
}

export function ArticleCard({ article, index }: ArticleCardProps) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {/* Number */}
      <span className="text-xs font-bold text-tactical-green shrink-0 w-4 mt-0.5">
        {index}.
      </span>

      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Title */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-foreground/90 hover:text-tactical-green transition-colors leading-snug"
        >
          {article.title}
        </a>

        {/* URL */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-tactical-green/70 hover:text-tactical-green truncate transition-colors"
        >
          {article.url}
        </a>
      </div>
    </div>
  );
}
