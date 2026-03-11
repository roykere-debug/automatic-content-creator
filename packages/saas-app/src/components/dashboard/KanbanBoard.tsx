import { Article, ArticleStatus } from "@/types/article";
import { ArticleCard } from "./ArticleCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, Send } from "lucide-react";

interface KanbanBoardProps {
  articles: Article[];
  onArticleClick: (article: Article) => void;
}

interface Column {
  id: ArticleStatus;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "newLead" | "draftReady" | "sentToWp";
}

const columns: Column[] = [
  { id: "new_lead", title: "New Leads", icon: FileText, variant: "newLead" },
  { id: "draft_ready", title: "Drafts Ready", icon: CheckCircle, variant: "draftReady" },
  { id: "sent_to_wp", title: "Sent to WP", icon: Send, variant: "sentToWp" },
];

export function KanbanBoard({ articles, onArticleClick }: KanbanBoardProps) {
  const getArticlesByStatus = (status: ArticleStatus) =>
    articles.filter((a) => a.status === status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 md:h-[calc(100vh-380px)] md:min-h-[400px]">
      {columns.map((column) => {
        const columnArticles = getArticlesByStatus(column.id);
        return (
          <div
            key={column.id}
            className="flex flex-col rounded-lg border border-border bg-card overflow-hidden"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <column.icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm font-medium">{column.title}</span>
              </div>
              <Badge variant={column.variant}>{columnArticles.length}</Badge>
            </div>

            {/* Column Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {columnArticles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <column.icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <span className="font-mono text-xs text-muted-foreground">
                      No articles
                    </span>
                  </div>
                ) : (
                  columnArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onClick={() => onArticleClick(article)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
