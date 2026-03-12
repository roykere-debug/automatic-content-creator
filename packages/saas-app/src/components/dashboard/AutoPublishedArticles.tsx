import { useEffect, useState } from "react";
import { Rocket, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface AutoPublishedArticle {
  id: string;
  english_title: string;
  wordpress_english_url: string | null;
  source_name: string | null;
  created_at: string;
  unsplash_photo_url: string | null;
}

interface AutoPublishedArticlesProps {
  refreshTrigger?: number;
}

export function AutoPublishedArticles({ refreshTrigger }: AutoPublishedArticlesProps) {
  const [articles, setArticles] = useState<AutoPublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("article_drafts")
        .select("id, english_title, wordpress_english_url, source_name, created_at, unsplash_photo_url")
        .in("status", ["sent_to_wp", "published_hebrew", "published_english"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        setArticles(data);
      }
      setLoading(false);
    };

    fetchArticles();
  }, [refreshTrigger]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs md:text-sm font-medium">Auto-Published</span>
        </div>
        <Badge variant="tactical" className="text-[10px] md:text-xs">{articles.length} ARTICLES</Badge>
      </div>
      <ScrollArea className="h-[200px] md:h-[300px]">
        <div className="p-3 md:p-4 space-y-2 md:space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8">
              <span className="font-mono text-xs md:text-sm text-muted-foreground">
                No auto-published articles yet.
              </span>
            </div>
          ) : (
            articles.map((article) => (
              <a
                key={article.id}
                href={article.wordpress_english_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 md:gap-3 rounded-md bg-surface p-2 md:p-3 hover:bg-surface/80 transition-colors cursor-pointer group"
              >
                <Rocket className="h-3 w-3 md:h-4 md:w-4 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs md:text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {article.english_title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {article.source_name && (
                      <span className="font-mono text-[10px] md:text-xs text-muted-foreground">
                        {article.source_name}
                      </span>
                    )}
                    <span className="font-mono text-[9px] md:text-[10px] text-muted-foreground">
                      {new Date(article.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {article.wordpress_english_url && (
                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                )}
              </a>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
