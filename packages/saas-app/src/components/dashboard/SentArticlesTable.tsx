import { useState, useEffect } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface SentArticle {
  id: string;
  article_url: string;
  article_title: string;
  keyword_used: string | null;
  email_sent_to: string | null;
  sent_at: string;
  image_url: string | null;
  // These will be populated from translation (if available)
  hebrew_title?: string;
  english_title?: string;
}

interface SentArticlesTableProps {
  onArticleClick: (article: SentArticle) => void;
  refreshTrigger?: number;
}

export function SentArticlesTable({ onArticleClick, refreshTrigger }: SentArticlesTableProps) {
  const [articles, setArticles] = useState<SentArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArticles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-articles', {
      body: { action: 'list', limit: 50 }
    });

    if (error || !data?.success) {
      console.error("Error fetching articles:", error || data?.error);
    } else {
      setArticles(data.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-mono">אין כתבות שנשלחו עדיין</p>
        <p className="text-sm mt-1">לחץ על "GENERATE & SEND" לשליחת כתבה ראשונה</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface hover:bg-surface">
            <TableHead className="font-mono text-xs uppercase tracking-wider w-16">תמונה</TableHead>
            <TableHead className="font-mono text-xs uppercase tracking-wider min-w-[200px]">כותרת</TableHead>
            <TableHead className="font-mono text-xs uppercase tracking-wider w-32 hidden sm:table-cell">מילת חיפוש</TableHead>
            <TableHead className="font-mono text-xs uppercase tracking-wider w-28 hidden md:table-cell">נשלח ב</TableHead>
            <TableHead className="font-mono text-xs uppercase tracking-wider w-16 text-center">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => (
            <TableRow 
              key={article.id} 
              className="cursor-pointer hover:bg-surface/50 transition-colors"
              onClick={() => onArticleClick(article)}
            >
              <TableCell className="p-2">
                {article.image_url ? (
                  <a 
                    href={article.image_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="פתח תמונה ב-Unsplash"
                  >
                    <img 
                      src={article.image_url} 
                      alt="" 
                      className="w-12 h-8 md:w-14 md:h-10 object-cover rounded border border-border hover:border-primary transition-colors"
                    />
                  </a>
                ) : (
                  <div className="w-12 h-8 md:w-14 md:h-10 bg-muted rounded border border-border flex items-center justify-center">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-xs md:text-sm line-clamp-2 md:line-clamp-1">{article.article_title}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                    {new URL(article.article_url).hostname}
                  </p>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className="text-[10px] md:text-xs font-mono">
                  {article.keyword_used ? (article.keyword_used.length > 15 ? article.keyword_used.substring(0, 15) + '...' : article.keyword_used) : '-'}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-[10px] md:text-xs text-muted-foreground hidden md:table-cell">
                {format(new Date(article.sent_at), 'dd/MM/yy HH:mm')}
              </TableCell>
              <TableCell className="text-center p-1 md:p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(article.article_url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}