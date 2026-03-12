import { useEffect, useState } from "react";
import { Rocket, ExternalLink, Loader2 } from "lucide-react";
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
      if (!error && data) setArticles(data);
      setLoading(false);
    };
    fetchArticles();
  }, [refreshTrigger]);

  return (
    <div
      style={{
        backgroundColor: "rgb(var(--c-surface))",
        border: "1px solid rgb(var(--c-border))",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {/* Body */}
      <div style={{ maxHeight: 280, overflowY: "auto", padding: "8px 0" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
            }}
          >
            <Loader2
              size={16}
              style={{ color: "rgb(var(--c-fg-muted))", animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : articles.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 0",
              gap: 6,
            }}
          >
            <Rocket size={28} style={{ color: "rgb(var(--c-fg-muted))", opacity: 0.4 }} />
            <span style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))" }}>
              No auto-published articles yet
            </span>
            <span style={{ fontSize: 11, color: "rgb(var(--c-fg-subtle))" }}>
              Launch a scan to get started
            </span>
          </div>
        ) : (
          articles.map((article) => (
            <a
              key={article.id}
              href={article.wordpress_english_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "8px 16px",
                textDecoration: "none",
                transition: "background-color 100ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                  "rgb(var(--c-surface-2))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
              }}
            >
              <Rocket
                size={12}
                style={{
                  color: "rgb(var(--c-fg-muted))",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "rgb(var(--c-fg))",
                    margin: "0 0 3px",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  {article.english_title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {article.source_name && (
                    <span style={{ fontSize: 10, color: "rgb(var(--c-fg-muted))" }}>
                      {article.source_name}
                    </span>
                  )}
                  <span
                    className="data-value"
                    style={{ fontSize: 10, color: "rgb(var(--c-fg-subtle))" }}
                  >
                    {new Date(article.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {article.wordpress_english_url && (
                <ExternalLink
                  size={11}
                  style={{ color: "rgb(var(--c-fg-muted))", flexShrink: 0, marginTop: 2 }}
                />
              )}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
