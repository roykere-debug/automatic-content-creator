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

  const handleLaunchScan = useCallback(async () => {
    setIsScanning(true);
    toast.info("Starting scan...", { description: "Searching for new articles..." });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session — please sign in again.");
      const authHeader = { Authorization: `Bearer ${session.access_token}` };

      const query = getScanQuery();
      const { data, error } = await supabase.functions.invoke("search-news", {
        body: { query, maxResults: 20 },
        headers: authHeader,
      });
      if (error) throw error;
      const articles: Array<{ title: string; url: string; image?: string; source?: string }> = data?.articles ?? [];
      const count = articles.length;

      // Save new articles to article_drafts as leads (deduplicate against existing)
      if (count > 0 && session.user?.id) {
        const { data: existing } = await supabase
          .from("article_drafts")
          .select("source_url");
        const knownUrls = new Set((existing ?? []).map((d: { source_url: string }) => d.source_url));
        const newLeads = articles.filter((a) => a.url && !knownUrls.has(a.url));
        if (newLeads.length > 0) {
          const { error: insertError } = await supabase.from("article_drafts").insert(
            newLeads.map((a) => ({
              user_id: session.user.id,
              source_url: a.url,
              source_title: a.title,
              source_image: a.image ?? null,
              source_name: a.source ?? null,
              status: "lead",
            }))
          );
          if (insertError) {
            console.error("Failed to save articles:", insertError.message);
            toast.warning("Articles found but could not be saved", { description: insertError.message });
          }
          setRefreshTrigger((prev) => prev + 1);
        }
      }

      setLastScan(new Date());
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          type: "scan" as const,
          message: `Found ${count} article${count !== 1 ? "s" : ""} for "${query}"`,
          timestamp: new Date(),
          details: articles.map((a) => a.title).join(", "),
        },
        ...prev,
      ]);
      toast.success(`Scan complete — ${count} articles found`);
    } catch (err) {
      console.error("Scan error:", err);
      // Try to extract the real error body from the edge function response
      let msg = err instanceof Error ? err.message : "Unknown error";
      let body: any = null;
      try {
        const ctx = (err as { context?: Response }).context;
        if (ctx) {
          body = await ctx.clone().json();
          msg = body?.error ?? body?.message ?? msg;
        }
      } catch { /* ignore body parse failure */ }

      console.error("Scan error:", msg);

      let description = msg;
      if (msg.includes("TAVILY_API_KEY") || msg.includes("tavily")) description = "Add TAVILY_API_KEY to Supabase Vault secrets";
      else if (msg.includes("403") || msg.includes("Forbidden") || msg.includes("Admin")) description = "Your user is missing admin role — run the SQL setup again";
      else if (msg.includes("401") || msg.includes("Unauthorized")) description = "Session expired — please sign out and sign in again";
      toast.error("Scan failed", { description });
    } finally {
      setIsScanning(false);
    }
  }, [getScanQuery]);

  const handleGenerateAndSendArticle = async () => {
    setIsSendingEmail(true);
    toast.info("Searching for a new article...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session — please sign in again.");
      const authHeader = { Authorization: `Bearer ${session.access_token}` };

      // 1. Get active recipients
      const { data: recipientsData, error: recipientsError } = await supabase.functions.invoke("manage-recipients", {
        body: { action: "list_active" },
        headers: authHeader,
      });
      if (recipientsError) throw new Error(`Recipients error: ${recipientsError.message}`);
      const activeRecipients = recipientsData?.data || [];
      const recipientEmails = activeRecipients.map((r: { email: string }) => r.email);
      if (recipientEmails.length === 0) {
        toast.warning("No active recipients", { description: "Add email recipients in Settings → Email" });
        setIsSendingEmail(false);
        return;
      }

      // 2. Get already-sent URLs to avoid duplicates
      const { data: sentData } = await supabase.functions.invoke("manage-articles", { body: { action: "get_sent_urls" }, headers: authHeader });
      const sentArticles = sentData?.data || [];
      const sentUrls = new Set(sentArticles.map((a: { article_url: string }) => a.article_url));
      const usedImageUrls = new Set(sentArticles.map((a: { image_url: string | null }) => a.image_url).filter(Boolean));

      // 3. Find a new unseen article
      let newArticle = null;
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts && !newArticle; attempt++) {
        const query = getScanQuery();
        const { data: searchData, error: searchError } = await supabase.functions.invoke("search-news", {
          body: { query, maxResults: 10, usedImageUrls: Array.from(usedImageUrls) },
          headers: authHeader,
        });
        if (searchError) {
          const msg = searchError.message || "";
          if (msg.includes("TAVILY_API_KEY") || msg.includes("not configured")) {
            throw new Error("TAVILY_API_KEY is not set. Add it in Supabase → Edge Functions → Secrets.");
          }
          console.error("Search error:", searchError);
          continue;
        }
        if (searchData?.success && searchData?.articles?.length) {
          newArticle = searchData.articles.find((a: { url: string }) => !sentUrls.has(a.url));
        }
      }
      if (!newArticle) {
        toast.warning("No new articles found", { description: "All recent articles have already been sent, or no results for current keywords." });
        setIsSendingEmail(false);
        return;
      }

      // 4. Generate primary + secondary article
      toast.info("Generating article content...");
      const { data: articleData, error: articleError } = await supabase.functions.invoke("translate-article", {
        body: { title: newArticle.title, content: newArticle.content, url: newArticle.url, source: newArticle.source },
        headers: authHeader,
      });
      if (articleError) {
        const msg = articleError.message || "";
        if (msg.includes("AI_API_KEY") || msg.includes("LOVABLE_API_KEY")) {
          throw new Error("AI API key is not set. Add AI_API_KEY to Supabase → Edge Functions → Secrets.");
        }
        throw articleError;
      }
      if (!articleData?.success) throw new Error(articleData?.error || "Article generation failed");

      const primaryArticle = articleData?.data?.primaryArticle ?? articleData?.data?.englishArticle;
      const secondaryArticle = articleData?.data?.secondaryArticle ?? articleData?.data?.hebrewArticle;
      if (!primaryArticle?.title || !primaryArticle?.content) throw new Error("AI returned empty article — check AI_API_KEY secret");

      // 5. Send emails
      const bilingual = config.bilingual_mode && secondaryArticle?.title && secondaryArticle?.content;
      toast.info(`Sending to ${recipientEmails.length} recipient${recipientEmails.length !== 1 ? "s" : ""}...`);
      const sendPromises = recipientEmails.map(async (email: string) => {
        const { data, error } = await supabase.functions.invoke("send-article-email", {
          body: {
            to: email,
            article: { title: primaryArticle.title, content: primaryArticle.content, source: newArticle.source, url: newArticle.url, image: newArticle.image },
            secondaryArticle: bilingual ? { title: secondaryArticle.title, content: secondaryArticle.content } : undefined,
            sendBothLanguages: bilingual,
          },
          headers: authHeader,
        });
        if (error) console.error(`Email error for ${email}:`, error);
        return { email, success: !error && data?.success };
      });

      const results = await Promise.all(sendPromises);
      const successCount = results.filter((r) => r.success).length;
      const successEmails = results.filter((r) => r.success).map((r) => r.email);

      if (successCount === 0) {
        toast.error("All emails failed", { description: "Check that RESEND_API_KEY is set in Supabase Vault" });
      } else {
        // Record in sent_articles so it shows up in the dashboard table
        await supabase.functions.invoke("manage-articles", {
          body: {
            action: "add",
            article_url: newArticle.url,
            article_title: primaryArticle.title,
            keyword_used: getScanQuery(),
            email_sent_to: successEmails.join(", "),
            image_url: newArticle.image ?? null,
          },
          headers: authHeader,
        });

        // Update the lead status in article_drafts if this article was a saved lead
        await supabase
          .from("article_drafts")
          .update({ status: "draft" })
          .eq("source_url", newArticle.url)
          .eq("status", "lead");

        toast.success(`Sent to ${successCount}/${recipientEmails.length} recipients`);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Generate & send error:", err);
      toast.error("Error sending article", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendDigest = async () => {
    setIsSendingDigest(true);
    toast.info("Sending daily digest...", { description: "This may take up to 60 seconds" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No active session — please sign in again.");
      const { data, error } = await supabase.functions.invoke("daily-digest", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Daily digest sent successfully");
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const errMsg = data?.error || "Unknown error";
        let hint = "";
        if (errMsg.includes("RESEND")) hint = " — Set RESEND_API_KEY in Edge Function Secrets";
        else if (errMsg.includes("rss_feeds") || errMsg.includes("No candidates")) hint = " — Add RSS feeds in Settings → Content";
        toast.error("Digest failed", { description: errMsg + hint });
      }
    } catch (err) {
      console.error("Digest error:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Error sending digest", { description: msg });
    } finally {
      setIsSendingDigest(false);
    }
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
