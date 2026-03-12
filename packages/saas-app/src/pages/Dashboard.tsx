import { useState, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { ScanControls } from "@/components/dashboard/ScanControls";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { AutoPublishedArticles } from "@/components/dashboard/AutoPublishedArticles";
import { SentArticlesTable, SentArticle } from "@/components/dashboard/SentArticlesTable";
import { ArticlePublishModal } from "@/components/dashboard/ArticlePublishModal";
import { toast } from "sonner";
import { Mail, Loader2, Newspaper, Activity } from "lucide-react";
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
        { id: Date.now().toString(), type: "scan" as const, message: "Scan complete", timestamp: new Date(), details: "Scanned 50 items" },
        ...prev,
      ]);
      toast.success("Scan complete");
    }, 3000);
  }, []);

  const handleGenerateAndSendArticle = async () => {
    setIsSendingEmail(true);
    toast.info("Searching for a new article...");
    try {
      const { data: recipientsData, error: recipientsError } = await supabase.functions.invoke("manage-recipients", {
        body: { action: "list_active" },
      });
      if (recipientsError || !recipientsData?.success) console.error("Error fetching recipients:", recipientsError || recipientsData?.error);
      const activeRecipients = recipientsData?.data || [];
      const recipientEmails = activeRecipients.map((r: { email: string }) => r.email);
      if (recipientEmails.length === 0) {
        toast.warning("No active recipients", { description: "Add recipients in Settings" });
        setIsSendingEmail(false);
        return;
      }
      const { data: sentData } = await supabase.functions.invoke("manage-articles", { body: { action: "get_sent_urls" } });
      const sentArticles = sentData?.data || [];
      const sentUrls = new Set(sentArticles.map((a: { article_url: string }) => a.article_url));
      const usedImageUrls = new Set(sentArticles.map((a: { image_url: string | null }) => a.image_url).filter(Boolean));
      let newArticle = null;
      let usedQuery = "";
      const maxAttempts = 20;
      for (let attempt = 0; attempt < maxAttempts && !newArticle; attempt++) {
        usedQuery = getScanQuery();
        const { data: searchData, error: searchError } = await supabase.functions.invoke("search-news", {
          body: { query: usedQuery, maxResults: 10, usedImageUrls: Array.from(usedImageUrls) },
        });
        if (searchError) { console.error("Search error:", searchError); continue; }
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
      const { data: articleData, error: articleError } = await supabase.functions.invoke("translate-article", {
        body: { title: newArticle.title, content: newArticle.content, url: newArticle.url, source: newArticle.source },
      });
      if (articleError) throw articleError;
      const primaryArticle = articleData?.data?.primaryArticle ?? articleData?.data?.englishArticle;
      const secondaryArticle = articleData?.data?.secondaryArticle ?? articleData?.data?.hebrewArticle;
      if (!primaryArticle?.title || !primaryArticle?.content) throw new Error("Failed to generate primary article");
      const bilingual = config.bilingual_mode && secondaryArticle?.title && secondaryArticle?.content;
      toast.info(`Sending ${recipientEmails.length * (bilingual ? 2 : 1)} emails...`);
      const sendPromises = recipientEmails.map(async (email: string) => {
        const { data, error } = await supabase.functions.invoke("send-article-email", {
          body: {
            to: email,
            article: { title: primaryArticle.title, content: primaryArticle.content, source: newArticle.source, url: newArticle.url, image: newArticle.image },
            secondaryArticle: bilingual ? { title: secondaryArticle.title, content: secondaryArticle.content } : undefined,
            sendBothLanguages: bilingual,
          },
        });
        if (error) console.error(`Error sending to ${email}:`, error);
        return { email, success: !error && data?.success };
      });
      const results = await Promise.all(sendPromises);
      const successCount = results.filter((r) => r.success).length;
      if (successCount === 0) toast.error("All emails failed to send");
      else { toast.success(`Sent to ${successCount}/${recipientEmails.length} recipients`); setRefreshTrigger((prev) => prev + 1); }
    } catch (err) {
      console.error("Generate & send error:", err);
      toast.error("Error sending article", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally { setIsSendingEmail(false); }
  };

  const handleSendDigest = async () => {
    setIsSendingDigest(true);
    toast.info("Sending daily digest...");
    try {
      const { data, error } = await supabase.functions.invoke("daily-digest");
      if (error) throw error;
      if (data?.success) { toast.success("Daily digest sent successfully"); setRefreshTrigger((prev) => prev + 1); }
      else toast.error("Digest send failed", { description: data?.error });
    } catch (err) {
      console.error("Digest error:", err);
      toast.error("Error sending digest");
    } finally { setIsSendingDigest(false); }
  };

  return (
    <Layout>
      <div style={{ padding: "28px 28px 40px" }}>
        {/* ── Page header ──────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ color: "rgb(var(--c-fg))", marginBottom: 4 }}>
              {config.brand_name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "rgb(var(--c-green))",
                  animation: "pulse 2s infinite",
                }}
              />
              <span style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))" }}>
                Live · {config.scan_keywords?.length ?? 0} keywords active
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              className="btn-ghost"
              onClick={handleGenerateAndSendArticle}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Mail size={14} />
              )}
              Send Article
            </button>
            <button
              className="btn-primary"
              onClick={handleSendDigest}
              disabled={isSendingDigest}
            >
              {isSendingDigest ? (
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Newspaper size={14} />
              )}
              Send Digest
            </button>
          </div>
        </div>

        {/* ── Stats ────────────────────────── */}
        <StatsCards refreshTrigger={refreshTrigger} />

        {/* ── Scan controls ────────────────── */}
        <div style={{ marginTop: 24 }}>
          <div className="section-header">
            <span className="section-title">Scan Controls</span>
          </div>
          <ScanControls isScanning={isScanning} lastScan={lastScan} onLaunchScan={handleLaunchScan} />
        </div>

        {/* ── Auto-published ───────────────── */}
        <div style={{ marginTop: 28 }}>
          <div className="section-header">
            <span className="section-title">Auto-Published</span>
          </div>
          <AutoPublishedArticles refreshTrigger={refreshTrigger} />
        </div>

        {/* ── Sent articles ────────────────── */}
        <div style={{ marginTop: 28 }}>
          <div className="section-header">
            <span className="section-title">Sent Articles</span>
          </div>
          <SentArticlesTable refreshTrigger={refreshTrigger} onArticleClick={setSelectedArticle} />
        </div>
      </div>

      {selectedArticle && (
        <ArticlePublishModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </Layout>
  );
}
