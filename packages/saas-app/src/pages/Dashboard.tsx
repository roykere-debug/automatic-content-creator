import { useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { ScanControls } from "@/components/dashboard/ScanControls";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { AutoPublishedArticles } from "@/components/dashboard/AutoPublishedArticles";
import { SentArticlesTable, SentArticle } from "@/components/dashboard/SentArticlesTable";
import { ArticlePublishModal } from "@/components/dashboard/ArticlePublishModal";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function Dashboard() {
  const { config } = useWorkspace();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(new Date());
  const [logs, setLogs] = useState<Array<{ id: string; type: "scan"; message: string; timestamp: Date; details: string }>>([]);
  const [selectedArticle, setSelectedArticle] = useState<SentArticle | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Use workspace scan keywords — fallback to a generic phrase if none configured
  const getScanQuery = (): string => {
    const keywords = config.scan_keywords ?? [];
    if (keywords.length === 0) return "technology startup funding";
    return keywords[Math.floor(Math.random() * keywords.length)];
  };

  const handleLaunchScan = useCallback(() => {
    setIsScanning(true);
    toast.info("Starting scan...", { description: "Searching for new articles..." });

    setTimeout(() => {
      setIsScanning(false);
      setLastScan(new Date());
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          type: "scan" as const,
          message: "Scan complete",
          timestamp: new Date(),
          details: "Scanned 50 items",
        },
        ...prev,
      ]);
      toast.success("Scan complete");
    }, 3000);
  }, []);

  const handleGenerateAndSendArticle = async () => {
    setIsSendingEmail(true);
    toast.info("Searching for a new article...");

    try {
      // Get active email recipients
      const { data: recipientsData, error: recipientsError } = await supabase.functions.invoke("manage-recipients", {
        body: { action: "list_active" },
      });

      if (recipientsError || !recipientsData?.success) {
        console.error("Error fetching recipients:", recipientsError || recipientsData?.error);
      }

      const activeRecipients = recipientsData?.data || [];
      const recipientEmails = activeRecipients.map((r: { email: string }) => r.email);

      if (recipientEmails.length === 0) {
        toast.warning("No active recipients", { description: "Add recipients in Settings" });
        setIsSendingEmail(false);
        return;
      }

      // Get already-sent URLs
      const { data: sentData } = await supabase.functions.invoke("manage-articles", {
        body: { action: "get_sent_urls" },
      });

      const sentArticles = sentData?.data || [];
      const sentUrls = new Set(sentArticles.map((a: { article_url: string }) => a.article_url));
      const usedImageUrls = new Set(
        sentArticles.map((a: { image_url: string | null }) => a.image_url).filter(Boolean)
      );

      // Try workspace scan keywords to find a fresh article
      let newArticle = null;
      let usedQuery = "";
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts && !newArticle; attempt++) {
        usedQuery = getScanQuery();
        console.log(`Attempt ${attempt + 1}: query="${usedQuery}"`);

        const { data: searchData, error: searchError } = await supabase.functions.invoke("search-news", {
          body: { query: usedQuery, maxResults: 10, usedImageUrls: Array.from(usedImageUrls) },
        });

        if (searchError) {
          console.error("Search error:", searchError);
          continue;
        }

        if (searchData?.success && searchData?.articles?.length) {
          newArticle = searchData.articles.find((a: { url: string }) => !sentUrls.has(a.url));
        }
      }

      if (!newArticle) {
        toast.warning("All articles already sent", { description: `Tried ${maxAttempts} different queries` });
        setIsSendingEmail(false);
        return;
      }

      toast.info("Generating articles...");

      // Generate articles (primary + secondary language)
      const { data: articleData, error: articleError } = await supabase.functions.invoke("translate-article", {
        body: {
          title: newArticle.title,
          content: newArticle.content,
          url: newArticle.url,
          source: newArticle.source,
        },
      });

      if (articleError) throw articleError;

      // Support both new (primaryArticle/secondaryArticle) and legacy (englishArticle/hebrewArticle) keys
      const primaryArticle = articleData?.data?.primaryArticle ?? articleData?.data?.englishArticle;
      const secondaryArticle = articleData?.data?.secondaryArticle ?? articleData?.data?.hebrewArticle;

      if (!primaryArticle?.title || !primaryArticle?.content) {
        throw new Error("Failed to generate primary article");
      }

      const bilingual = config.bilingual_mode && secondaryArticle?.title && secondaryArticle?.content;
      toast.info(`Sending ${recipientEmails.length * (bilingual ? 2 : 1)} emails...`);

      // Send to all active recipients
      const sendPromises = recipientEmails.map(async (email: string) => {
        const { data, error } = await supabase.functions.invoke("send-article-email", {
          body: {
            to: email,
            article: {
              title: primaryArticle.title,
              content: primaryArticle.content,
              source: newArticle.source,
              url: newArticle.url,
              image: newArticle.image,
            },
            secondaryArticle:
              bilingual
                ? { title: secondaryArticle.title, content: secondaryArticle.content }
                : undefined,
            sendBothLanguages: bilingual,
          },
        });

        if (error) console.error(`Error sending to ${email}:`, error);
        return { email, success: !error && data?.success };
      });

      const results = await Promise.all(sendPromises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === 0) {
        toast.error("All emails failed to send");
      } else {
        toast.success(`Sent to ${successCount}/${recipientEmails.length} recipients`);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Generate & send error:", err);
      toast.error("Error sending article", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendDigest = async () => {
    setIsSendingDigest(true);
    toast.info("Sending daily digest...");

    try {
      const { data, error } = await supabase.functions.invoke("daily-digest");
      if (error) throw error;

      if (data?.success) {
        toast.success("Daily digest sent successfully");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error("Digest send failed", { description: data?.error });
      }
    } catch (err) {
      console.error("Digest error:", err);
      toast.error("Error sending digest");
    } finally {
      setIsSendingDigest(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-lg md:text-xl font-bold">{config.brand_name} Dashboard</h1>
            <p className="font-mono text-xs text-muted-foreground">
              {config.scan_keywords?.length ?? 0} keywords configured
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateAndSendArticle}
              disabled={isSendingEmail}
              className="flex items-center gap-2"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Article
            </Button>
            <Button
              variant="outline"
              onClick={handleSendDigest}
              disabled={isSendingDigest}
              className="flex items-center gap-2"
            >
              {isSendingDigest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Newspaper className="h-4 w-4" />
              )}
              Send Digest
            </Button>
          </div>
        </div>

        <StatsCards refreshTrigger={refreshTrigger} />

        <ScanControls
          isScanning={isScanning}
          lastScan={lastScan}
          onLaunchScan={handleLaunchScan}
        />

        <AutoPublishedArticles refreshTrigger={refreshTrigger} />

        <SentArticlesTable
          refreshTrigger={refreshTrigger}
          onArticleClick={setSelectedArticle}
        />

        {selectedArticle && (
          <ArticlePublishModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />
        )}
      </div>
    </Layout>
  );
}
