import { useEffect, useState } from "react";
import { FileText, CheckCircle, Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  newLeads: number;
  draftsReady: number;
  sentToWp: number;
  flaggedForReview: number;
}

interface StatsCardsProps {
  refreshTrigger?: number;
}

export function StatsCards({ refreshTrigger }: StatsCardsProps) {
  const [stats, setStats] = useState<Stats>({ newLeads: 0, draftsReady: 0, sentToWp: 0, flaggedForReview: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.from("article_drafts").select("status");
      if (data) {
        const counts = data.reduce(
          (acc, row) => {
            if (row.status === "draft") acc.draftsReady++;
            else if (["sent_to_wp", "published_hebrew", "published_english"].includes(row.status)) acc.sentToWp++;
            else if (row.status === "flagged") acc.flaggedForReview++;
            else acc.newLeads++;
            return acc;
          },
          { newLeads: 0, draftsReady: 0, sentToWp: 0, flaggedForReview: 0 }
        );
        setStats(counts);
      }
    };
    fetchStats();
  }, [refreshTrigger]);

  const cards = [
    { label: "New Leads",     value: stats.newLeads,         icon: FileText     },
    { label: "Drafts Ready",  value: stats.draftsReady,      icon: CheckCircle  },
    { label: "Sent to WP",    value: stats.sentToWp,         icon: Send         },
    { label: "Needs Review",  value: stats.flaggedForReview, icon: AlertTriangle },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
      }}
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            style={{
              backgroundColor: "rgb(var(--c-surface))",
              border: "1px solid rgb(var(--c-border))",
              borderRadius: "var(--radius)",
              padding: "16px 18px",
              transition: "border-color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgb(var(--c-surface-3))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgb(var(--c-border))";
            }}
          >
            {/* Top row: icon + label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "rgb(var(--c-fg-muted))",
                }}
              >
                {card.label}
              </span>
              <Icon size={14} style={{ color: "rgb(var(--c-fg-muted))" }} />
            </div>

            {/* Value */}
            <div
              className="data-value"
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                color: "rgb(var(--c-fg))",
              }}
            >
              {card.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
