import { useState, useEffect } from "react";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
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
    const { data, error } = await supabase.functions.invoke("manage-articles", {
      body: { action: "list", limit: 50 },
    });
    if (error || !data?.success) console.error("Error fetching articles:", error || data?.error);
    else setArticles(data.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [refreshTrigger]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 0",
          backgroundColor: "rgb(var(--c-surface))",
          border: "1px solid rgb(var(--c-border))",
          borderRadius: "var(--radius)",
        }}
      >
        <Loader2
          size={20}
          style={{ color: "rgb(var(--c-primary))", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "64px 0",
          backgroundColor: "rgb(var(--c-surface))",
          border: "1px solid rgb(var(--c-border))",
          borderRadius: "var(--radius)",
          gap: 10,
        }}
      >
        <Globe size={28} style={{ color: "rgb(var(--c-fg-muted))", opacity: 0.4 }} />
        <p style={{ fontSize: 13, color: "rgb(var(--c-fg-muted))" }}>No articles sent yet</p>
        <p style={{ fontSize: 11, color: "rgb(var(--c-fg-subtle))" }}>
          Launch a scan then send the first article to recipients
        </p>
      </div>
    );
  }

  const colStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "10px 14px",
    fontSize: 12,
    color: "rgb(var(--c-fg-muted))",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgb(var(--c-border))",
    whiteSpace: "nowrap",
    ...extra,
  });

  const cellStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: "10px 14px",
    borderBottom: "1px solid rgb(var(--c-border-soft))",
    ...extra,
  });

  return (
    <div
      style={{
        backgroundColor: "rgb(var(--c-surface))",
        border: "1px solid rgb(var(--c-border))",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "rgb(var(--c-surface-2))" }}>
              <th style={colStyle({ width: 52 })}>Img</th>
              <th style={colStyle()}>Title</th>
              <th style={colStyle({ width: 140 })}>Keyword</th>
              <th style={colStyle({ width: 120 })}>Sent</th>
              <th style={colStyle({ width: 48, textAlign: "center" })}>—</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article, i) => (
              <tr
                key={article.id}
                style={{ cursor: "pointer", transition: "background-color 100ms ease" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    "rgb(var(--c-surface-2))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
                }}
                onClick={() => onArticleClick(article)}
              >
                {/* Thumbnail */}
                <td style={cellStyle({ padding: "8px 14px" })}>
                  {article.image_url ? (
                    <a
                      href={article.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={article.image_url}
                        alt=""
                        style={{
                          width: 40,
                          height: 28,
                          objectFit: "cover",
                          borderRadius: 4,
                          border: "1px solid rgb(var(--c-border))",
                          display: "block",
                        }}
                      />
                    </a>
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: "rgb(var(--c-surface-2))",
                        border: "1px solid rgb(var(--c-border))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Globe size={12} style={{ color: "rgb(var(--c-fg-muted))" }} />
                    </div>
                  )}
                </td>

                {/* Title */}
                <td style={cellStyle()}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "rgb(var(--c-fg))",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      marginBottom: 2,
                    }}
                  >
                    {article.article_title}
                  </p>
                  <p style={{ fontSize: 11, color: "rgb(var(--c-fg-muted))" }}>
                    {(() => { try { return new URL(article.article_url).hostname; } catch { return ""; } })()}
                  </p>
                </td>

                {/* Keyword */}
                <td style={cellStyle()}>
                  {article.keyword_used ? (
                    <span className="pill pill-muted" style={{ fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {article.keyword_used.length > 18
                        ? article.keyword_used.substring(0, 18) + "…"
                        : article.keyword_used}
                    </span>
                  ) : (
                    <span style={{ color: "rgb(var(--c-fg-subtle))", fontSize: 12 }}>—</span>
                  )}
                </td>

                {/* Date */}
                <td style={cellStyle()}>
                  <span
                    className="data-value"
                    style={{ fontSize: 11, color: "rgb(var(--c-fg-muted))" }}
                  >
                    {format(new Date(article.sent_at), "dd/MM/yy HH:mm")}
                  </span>
                </td>

                {/* Action */}
                <td style={cellStyle({ textAlign: "center" })}>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgb(var(--c-fg-muted))",
                      padding: "4px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      transition: "color 150ms ease",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgb(var(--c-fg))"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgb(var(--c-fg-muted))"; }}
                    onClick={(e) => { e.stopPropagation(); window.open(article.article_url, "_blank"); }}
                  >
                    <ExternalLink size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
