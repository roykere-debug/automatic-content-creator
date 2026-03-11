import { ExternalLink, Image as ImageIcon, Star, Clock, Newspaper, Twitter, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Article, SourceType } from "@/types/article";

interface ArticleCardProps {
  article: Article;
  onClick: () => void;
}

const statusVariantMap = {
  new_lead: "newLead" as const,
  draft_ready: "draftReady" as const,
  sent_to_wp: "sentToWp" as const,
};

const statusLabelMap = {
  new_lead: "NEW LEAD",
  draft_ready: "DRAFT READY",
  sent_to_wp: "PUBLISHED",
};

const sourceTypeConfig: Record<SourceType, { icon: typeof Newspaper; label: string; color: string }> = {
  tavily: { icon: Newspaper, label: "NEWS", color: "text-blue-500" },
  social: { icon: Twitter, label: "SOCIAL", color: "text-sky-400" },
  reddit: { icon: MessageSquare, label: "REDDIT", color: "text-orange-500" },
};

export function ArticleCard({ article, onClick }: ArticleCardProps) {
  return (
    <div
      onClick={onClick}
      className="group card-tactical cursor-pointer rounded-lg overflow-hidden animate-fade-in"
    >
      {/* Image Section */}
      <div className="relative h-36 bg-surface overflow-hidden">
        {article.ogImage ? (
          <img
            src={article.ogImage}
            alt={article.sourceTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <span className="font-mono text-xs">NO IMAGE</span>
            </div>
          </div>
        )}
        
        {/* Status Badge Overlay */}
        <div className="absolute top-2 left-2">
          <Badge variant={statusVariantMap[article.status]}>
            {statusLabelMap[article.status]}
          </Badge>
        </div>

        {/* Relevance Score */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 backdrop-blur-sm">
          <Star className="h-3 w-3 text-accent fill-accent" />
          <span className="font-mono text-xs font-bold text-accent">
            {article.relevanceScore}/10
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Source Info */}
        <div className="flex items-center gap-2">
          {article.sourceType && sourceTypeConfig[article.sourceType] && (
            <>
              {(() => {
                const config = sourceTypeConfig[article.sourceType!];
                const IconComponent = config.icon;
                return (
                  <div className={`flex items-center gap-1 ${config.color}`}>
                    <IconComponent className="h-3 w-3" />
                    <span className="font-mono text-[10px] font-bold">{config.label}</span>
                  </div>
                );
              })()}
              <span className="text-muted-foreground">•</span>
            </>
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {article.sourceDomain}
          </span>
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {article.englishTitle || article.sourceTitle}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {article.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono text-[10px]">
              {new Date(article.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}
