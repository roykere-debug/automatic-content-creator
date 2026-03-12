import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EmailRecipientsManager } from "@/components/settings/EmailRecipientsManager";

type Tab = "branding" | "content" | "chatbot" | "email" | "integrations";

const TABS: { id: Tab; label: string }[] = [
  { id: "branding",      label: "Branding" },
  { id: "content",       label: "Content & Keywords" },
  { id: "chatbot",       label: "Chatbot" },
  { id: "email",         label: "Email" },
  { id: "integrations",  label: "Integrations" },
];

export default function Settings() {
  const { config, workspaceId, refetch } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("branding");

  // Branding
  const [brandName, setBrandName] = useState(config.brand_name);
  const [brandTagline, setBrandTagline] = useState(config.brand_tagline);
  const [brandLogoUrl, setBrandLogoUrl] = useState(config.brand_logo_url ?? "");
  const [industryVertical, setIndustryVertical] = useState(config.industry_vertical);

  // Keywords
  const [scanKeywords, setScanKeywords] = useState<string[]>(config.scan_keywords ?? []);
  const [newKeyword, setNewKeyword] = useState("");

  // RSS / Domains / Chatbot
  const [rssFeedsJson, setRssFeedsJson] = useState("");
  const [excludedDomainsText, setExcludedDomainsText] = useState("");
  const [chatbotSystemPrompt, setChatbotSystemPrompt] = useState("");
  const [allowedOriginsText, setAllowedOriginsText] = useState("");

  // Email
  const [emailSenderName, setEmailSenderName] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState(config.primary_language);
  const [bilingualMode, setBilingualMode] = useState(config.bilingual_mode);

  // WordPress
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wordpressUsername, setWordpressUsername] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-workspace-id", {
          body: { action: "get" },
        });
        if (error || !data?.settings) return;
        const s = data.settings;
        setBrandName(s.brand_name ?? config.brand_name);
        setBrandTagline(s.brand_tagline ?? config.brand_tagline);
        setBrandLogoUrl(s.brand_logo_url ?? "");
        setIndustryVertical(s.industry_vertical ?? config.industry_vertical);
        setScanKeywords(s.scan_keywords ?? []);
        setRssFeedsJson(JSON.stringify(s.rss_feeds ?? [], null, 2));
        setExcludedDomainsText((s.excluded_domains ?? []).join("\n"));
        setChatbotSystemPrompt(s.chatbot_system_prompt ?? "");
        setAllowedOriginsText((s.chatbot_allowed_origins ?? []).join("\n"));
        setEmailSenderName(s.email_sender_name ?? "");
        setEmailFromAddress(s.email_from_address ?? "");
        setDashboardUrl(s.dashboard_url ?? "");
        setPrimaryLanguage(s.primary_language ?? "en");
        setBilingualMode(s.bilingual_mode ?? false);
        setWordpressUrl(s.wordpress_url ?? "");
        setWordpressUsername(s.wordpress_username ?? "");
      } catch (err) {
        console.error("Error loading workspace settings:", err);
      }
    };
    load();
  }, [workspaceId, config]);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || scanKeywords.includes(trimmed)) return;
    setScanKeywords((prev) => [...prev, trimmed]);
    setNewKeyword("");
  };

  const handleSave = async () => {
    if (!workspaceId) { toast.error("No workspace found"); return; }
    setSaving(true);
    try {
      let rssFeeds: unknown[] = [];
      try { rssFeeds = JSON.parse(rssFeedsJson); }
      catch { toast.error("Invalid RSS feeds JSON"); setSaving(false); return; }

      const { data, error } = await supabase.functions.invoke("get-workspace-id", {
        body: {
          action: "update",
          settings: {
            brand_name: brandName, brand_tagline: brandTagline,
            brand_logo_url: brandLogoUrl || null, industry_vertical: industryVertical,
            scan_keywords: scanKeywords, rss_feeds: rssFeeds,
            excluded_domains: excludedDomainsText.split("\n").map((d) => d.trim()).filter(Boolean),
            chatbot_system_prompt: chatbotSystemPrompt || null,
            chatbot_allowed_origins: allowedOriginsText.split("\n").map((o) => o.trim()).filter(Boolean),
            email_sender_name: emailSenderName || null,
            email_from_address: emailFromAddress || null,
            dashboard_url: dashboardUrl || null,
            primary_language: primaryLanguage, bilingual_mode: bilingualMode,
            wordpress_url: wordpressUrl || null, wordpress_username: wordpressUsername || null,
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Save failed");
      await refetch();
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "rgb(var(--c-surface-2))",
    border: "1px solid rgb(var(--c-border))",
    borderRadius: "calc(var(--radius) - 2px)",
    fontSize: 13,
    color: "rgb(var(--c-fg))",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 150ms ease",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    resize: "vertical",
    lineHeight: 1.6,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "rgb(var(--c-fg-muted))",
    marginBottom: 6,
  };

  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 0 };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: "rgb(var(--c-surface))",
    border: "1px solid rgb(var(--c-border))",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: "14px 18px",
    borderBottom: "1px solid rgb(var(--c-border))",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  };

  const sectionBodyStyle: React.CSSProperties = { padding: 18 };

  return (
    <Layout>
      <div style={{ padding: "28px 28px 40px", maxWidth: 860 }}>
        {/* ── Header ─────────────────────────── */}
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
            <h1 style={{ color: "rgb(var(--c-fg))", marginBottom: 4 }}>Settings</h1>
            <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))" }}>
              Configure your workspace
            </p>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Save size={14} />
            )}
            Save Settings
          </button>
        </div>

        {/* ── Tab nav ────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 20,
            backgroundColor: "rgb(var(--c-surface))",
            border: "1px solid rgb(var(--c-border))",
            borderRadius: "var(--radius)",
            padding: 4,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "calc(var(--radius) - 4px)",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 150ms ease",
                backgroundColor: activeTab === tab.id ? "rgb(var(--c-surface-2))" : "transparent",
                color: activeTab === tab.id ? "rgb(var(--c-fg))" : "rgb(var(--c-fg-muted))",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────── */}

        {activeTab === "branding" && (
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Brand Configuration</h3>
              <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                Define your brand identity for this workspace
              </p>
            </div>
            <div style={{ ...sectionBodyStyle, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Brand Name</label>
                  <input style={inputStyle} value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="My Content Platform" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Tagline</label>
                  <input style={inputStyle} value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} placeholder="Content Intelligence" />
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Logo URL</label>
                <input style={inputStyle} value={brandLogoUrl} onChange={(e) => setBrandLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Industry Vertical</label>
                <input style={inputStyle} value={industryVertical} onChange={(e) => setIndustryVertical(e.target.value)} placeholder="defense-tech, fintech, healthtech…" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "content" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Keywords */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Scan Keywords</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  One random keyword is picked per scan
                </p>
              </div>
              <div style={{ ...sectionBodyStyle, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="Add keyword or phrase…"
                  />
                  <button className="btn-ghost" onClick={addKeyword}>
                    <Plus size={14} />
                    Add
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {scanKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        backgroundColor: "rgb(var(--c-surface-2))",
                        border: "1px solid rgb(var(--c-border))",
                        borderRadius: 99,
                        fontSize: 12,
                        color: "rgb(var(--c-fg))",
                      }}
                    >
                      {kw}
                      <button
                        onClick={() => setScanKeywords((prev) => prev.filter((k) => k !== kw))}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "rgb(var(--c-fg-muted))",
                          padding: 0,
                          display: "flex",
                          lineHeight: 1,
                        }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {scanKeywords.length === 0 && (
                    <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))" }}>No keywords yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* RSS Feeds */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>RSS Feeds</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  {`Format: [{"name":"Feed","url":"https://...","priority":1}]`}
                </p>
              </div>
              <div style={sectionBodyStyle}>
                <textarea
                  style={{ ...textareaStyle, minHeight: 160 }}
                  value={rssFeedsJson}
                  onChange={(e) => setRssFeedsJson(e.target.value)}
                  placeholder={`[\n  {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "priority": 1}\n]`}
                />
              </div>
            </div>

            {/* Excluded domains */}
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Excluded Domains</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  One domain per line. Articles from these domains are filtered out.
                </p>
              </div>
              <div style={sectionBodyStyle}>
                <textarea
                  style={{ ...textareaStyle, minHeight: 100 }}
                  value={excludedDomainsText}
                  onChange={(e) => setExcludedDomainsText(e.target.value)}
                  placeholder={"wsj.com\nft.com\nbloomberg.com"}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "chatbot" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>System Prompt</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  Leave blank to auto-generate from workspace config
                </p>
              </div>
              <div style={sectionBodyStyle}>
                <textarea
                  style={{ ...textareaStyle, minHeight: 160 }}
                  value={chatbotSystemPrompt}
                  onChange={(e) => setChatbotSystemPrompt(e.target.value)}
                  placeholder="You are an AI assistant for [brand]…"
                />
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Allowed Origins (CORS)</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  Domains allowed to embed the widget. One per line.
                </p>
              </div>
              <div style={sectionBodyStyle}>
                <textarea
                  style={{ ...textareaStyle, minHeight: 80 }}
                  value={allowedOriginsText}
                  onChange={(e) => setAllowedOriginsText(e.target.value)}
                  placeholder={"https://example.com\nhttps://www.example.com"}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <EmailRecipientsManager />

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Email Settings</h3>
                <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                  Configure how outgoing emails appear to recipients
                </p>
              </div>
              <div style={{ ...sectionBodyStyle, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Sender Name</label>
                    <input style={inputStyle} value={emailSenderName} onChange={(e) => setEmailSenderName(e.target.value)} placeholder="My Newsletter" />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>From Email</label>
                    <input style={inputStyle} type="email" dir="ltr" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} placeholder="news@example.com" />
                  </div>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Dashboard URL</label>
                  <input style={inputStyle} dir="ltr" value={dashboardUrl} onChange={(e) => setDashboardUrl(e.target.value)} placeholder="https://app.example.com" />
                </div>
              </div>
            </div>

            <div style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>Language Settings</h3>
              </div>
              <div style={{ ...sectionBodyStyle, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Primary Language</label>
                  <input style={{ ...inputStyle, maxWidth: 80 }} value={primaryLanguage} onChange={(e) => setPrimaryLanguage(e.target.value)} placeholder="en" maxLength={5} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Switch id="bilingual" checked={bilingualMode} onCheckedChange={setBilingualMode} />
                  <label htmlFor="bilingual" style={{ fontSize: 13, color: "rgb(var(--c-fg))", cursor: "pointer" }}>
                    Bilingual mode — send emails in 2 languages
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ color: "rgb(var(--c-fg))", margin: 0 }}>WordPress</h3>
              <p style={{ fontSize: 12, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                Connect to your WordPress site for auto-publishing
              </p>
            </div>
            <div style={{ ...sectionBodyStyle, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>WordPress Site URL</label>
                <input style={inputStyle} dir="ltr" value={wordpressUrl} onChange={(e) => setWordpressUrl(e.target.value)} placeholder="https://example.com" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>WordPress Username</label>
                <input style={inputStyle} dir="ltr" value={wordpressUsername} onChange={(e) => setWordpressUsername(e.target.value)} placeholder="admin" />
              </div>
              <p style={{ fontSize: 11, color: "rgb(var(--c-fg-muted))", margin: 0 }}>
                The WordPress App Password must be set as{" "}
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    backgroundColor: "rgb(var(--c-surface-2))",
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 11,
                  }}
                >
                  WORDPRESS_APP_PASSWORD
                </code>{" "}
                in Supabase Edge Functions secrets.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
