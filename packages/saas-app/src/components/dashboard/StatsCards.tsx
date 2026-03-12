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
  const [stats, setStats] = useState<Stats>({
    newLeads: 0,
    draftsReady: 0,
    sentToWp: 0,
    flaggedForReview: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from("article_drafts")
        .select("status");

      if (data) {
        const counts = data.reduce(
          (acc, row) => {
            if (row.status === "draft") acc.draftsReady++;
            else if (row.status === "sent_to_wp" || row.status === "published_hebrew" || row.status === "published_english") acc.sentToWp++;
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
    {
      label: "New Leads",
      value: stats.newLeads,
      icon: FileText,
      color: "text-status-active",
      bgColor: "bg-status-active/10",
      borderColor: "border-status-active/30",
    },
    {
      label: "Drafts Ready",
      value: stats.draftsReady,
      icon: CheckCircle,
      color: "text-status-pending",
      bgColor: "bg-status-pending/10",
      borderColor: "border-status-pending/30",
    },
    {
      label: "Sent to WP",
      value: stats.sentToWp,
      icon: Send,
      color: "text-status-sent",
      bgColor: "bg-status-sent/10",
      borderColor: "border-status-sent/30",
    },
    {
      label: "Needs Review",
      value: stats.flaggedForReview,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border ${card.borderColor} ${card.bgColor} p-4 transition-all hover:scale-[1.02]`}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <span className={`font-mono text-3xl font-bold ${card.color}`}>
                {card.value}
              </span>
            </div>
            <card.icon className={`h-8 w-8 ${card.color} opacity-50`} />
          </div>
        </div>
      ))}
    </div>
  );
}
