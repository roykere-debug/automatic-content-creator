import { useNavigate } from "react-router-dom";
import { X, Send, Globe, ExternalLink, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { SentArticle } from "./SentArticlesTable";

interface ArticlePublishModalProps {
  article: SentArticle;
  onClose: () => void;
}

export function ArticlePublishModal({ article, onClose }: ArticlePublishModalProps) {
  const navigate = useNavigate();

  const handlePublishToWordPress = () => {
    // Navigate to the article generator to generate & publish to WordPress
    handleGenerateArticle();
  };

  const handleGenerateArticle = () => {
    const hostname = new URL(article.article_url).hostname;
    const params = new URLSearchParams({
      url: article.article_url,
      title: article.article_title,
      image: article.image_url || '',
      source: hostname,
    });
    onClose();
    navigate(`/generate?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 md:px-6 py-3 md:py-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <Badge variant="tactical" className="text-xs">פרטי כתבה</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-10 md:w-10">
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Image */}
          {article.image_url && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img 
                src={article.image_url} 
                alt={article.article_title}
                className="w-full h-32 md:h-48 object-cover"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="font-mono text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">
              כותרת מקורית
            </label>
            <h2 className="text-base md:text-lg font-bold mt-1 leading-tight">{article.article_title}</h2>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="font-mono text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">
                מקור
              </label>
              <div className="flex items-center gap-2 mt-1">
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs md:text-sm truncate">{new URL(article.article_url).hostname}</span>
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">
                מילת חיפוש
              </label>
              <div className="mt-1">
                <Badge variant="outline" className="text-[10px] md:text-xs">{article.keyword_used || '-'}</Badge>
              </div>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="font-mono text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">
              קישור לכתבה המקורית
            </label>
            <a 
              href={article.article_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-1 text-primary hover:text-primary/80 text-xs md:text-sm break-all"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-2">{article.article_url}</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 md:px-6 py-3 md:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-card">
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            ביטול
          </Button>
          <Button 
            variant="outline"
            onClick={handleGenerateArticle}
            className="w-full sm:w-auto border-accent/50 hover:bg-accent/10"
          >
            <PenTool className="h-4 w-4" />
            צור כתבה
          </Button>
          <Button 
            variant="tactical" 
            onClick={handlePublishToWordPress}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4" />
            פרסם לוורדפרס
          </Button>
        </div>
      </div>
    </div>
  );
}