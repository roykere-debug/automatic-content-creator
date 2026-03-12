import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EmailRecipientsManager } from "@/components/settings/EmailRecipientsManager";

export default function Settings() {
  const { config, workspaceId, refetch } = useWorkspace();
  const [saving, setSaving] = useState(false);

  // Branding
  const [brandName, setBrandName] = useState(config.brand_name);
  const [brandTagline, setBrandTagline] = useState(config.brand_tagline);
  const [brandLogoUrl, setBrandLogoUrl] = useState(config.brand_logo_url ?? "");
  const [industryVertical, setIndustryVertical] = useState(config.industry_vertical);

  // Keywords
  const [scanKeywords, setScanKeywords] = useState<string[]>(config.scan_keywords ?? []);
  const [newKeyword, setNewKeyword] = useState("");

  // RSS Feeds (displayed as JSON textarea for simplicity)
  const [rssFeedsJson, setRssFeedsJson] = useState("");

  // Domains
  const [excludedDomainsText, setExcludedDomainsText] = useState("");

  // Chatbot
  const [chatbotSystemPrompt, setChatbotSystemPrompt] = useState("");
  const [allowedOriginsText, setAllowedOriginsText] = useState("");

  // Email
  const [emailSenderName, setEmailSenderName] = useState("");
  const [emailFromAddress, setEmailFromAddress] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");

  // Languages
  const [primaryLanguage, setPrimaryLanguage] = useState(config.primary_language);
  const [bilingualMode, setBilingualMode] = useState(config.bilingual_mode);

  // WordPress
  const [wordpressUrl, setWordpressUrl] = useState("");
  const [wordpressUsername, setWordpressUsername] = useState("");

  // Load full settings from edge function on mount
  // workspace_settings is service-role only, must go through the edge function
  useEffect(() => {
    if (!workspaceId) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-workspace-id", {
          body: { action: "get" },
        });

        if (error) {
          console.error("Failed to load workspace settings:", error);
          return;
        }

        if (!data?.settings) return;

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

    loadSettings();
  }, [workspaceId, config]);

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || scanKeywords.includes(trimmed)) return;
    setScanKeywords((prev) => [...prev, trimmed]);
    setNewKeyword("");
  };

  const removeKeyword = (kw: string) => {
    setScanKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleSave = async () => {
    if (!workspaceId) {
      toast.error("No workspace found");
      return;
    }

    setSaving(true);
    try {
      // Parse RSS feeds JSON
      let rssFeeds: unknown[] = [];
      try {
        rssFeeds = JSON.parse(rssFeedsJson);
      } catch {
        toast.error("Invalid RSS feeds JSON — please fix before saving");
        setSaving(false);
        return;
      }

      const excludedDomains = excludedDomainsText
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean);

      const chatbotAllowedOrigins = allowedOriginsText
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);

      // Use edge function for workspace_settings update (service-role only)
      const { data, error } = await supabase.functions.invoke("get-workspace-id", {
        body: {
          action: "update",
          settings: {
            brand_name: brandName,
            brand_tagline: brandTagline,
            brand_logo_url: brandLogoUrl || null,
            industry_vertical: industryVertical,
            scan_keywords: scanKeywords,
            rss_feeds: rssFeeds,
            excluded_domains: excludedDomains,
            chatbot_system_prompt: chatbotSystemPrompt || null,
            chatbot_allowed_origins: chatbotAllowedOrigins,
            email_sender_name: emailSenderName || null,
            email_from_address: emailFromAddress || null,
            dashboard_url: dashboardUrl || null,
            primary_language: primaryLanguage,
            bilingual_mode: bilingualMode,
            wordpress_url: wordpressUrl || null,
            wordpress_username: wordpressUsername || null,
          },
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Save failed");

      await refetch();
      toast.success("Settings saved", { description: "Workspace configuration updated" });
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-mono text-lg md:text-xl font-bold">Workspace Settings</h1>
              <p className="text-xs text-muted-foreground">Configure your content platform</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>

        <Tabs defaultValue="branding">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="content">Content & Keywords</TabsTrigger>
            <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* =================== BRANDING =================== */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Brand Configuration</CardTitle>
                <CardDescription>Define your brand identity for this workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-name">Brand Name</Label>
                    <Input
                      id="brand-name"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="My Content Platform"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-tagline">Tagline</Label>
                    <Input
                      id="brand-tagline"
                      value={brandTagline}
                      onChange={(e) => setBrandTagline(e.target.value)}
                      placeholder="Content Intelligence"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-logo">Logo URL</Label>
                  <Input
                    id="brand-logo"
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry Vertical</Label>
                  <Input
                    id="industry"
                    value={industryVertical}
                    onChange={(e) => setIndustryVertical(e.target.value)}
                    placeholder="e.g. defense-tech, fintech, healthtech"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================== CONTENT =================== */}
          <TabsContent value="content">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Scan Keywords</CardTitle>
                  <CardDescription>
                    Keywords used to search for relevant articles. One random keyword is picked per scan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                      placeholder="Add keyword or phrase..."
                    />
                    <Button onClick={addKeyword} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scanKeywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="flex items-center gap-1">
                        {kw}
                        <button onClick={() => removeKeyword(kw)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {scanKeywords.length === 0 && (
                      <p className="text-sm text-muted-foreground">No keywords yet. Add some above.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>RSS Feeds</CardTitle>
                  <CardDescription>
                    JSON array of feeds. Format: {`[{"name":"Feed","url":"https://...","priority":1}]`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={rssFeedsJson}
                    onChange={(e) => setRssFeedsJson(e.target.value)}
                    className="font-mono text-sm h-48"
                    placeholder={`[\n  {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "priority": 1}\n]`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Excluded Domains</CardTitle>
                  <CardDescription>One domain per line. Articles from these domains will be filtered out.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={excludedDomainsText}
                    onChange={(e) => setExcludedDomainsText(e.target.value)}
                    className="font-mono text-sm h-32"
                    placeholder={"wsj.com\nft.com\nbloomberg.com"}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =================== CHATBOT =================== */}
          <TabsContent value="chatbot">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chatbot System Prompt</CardTitle>
                  <CardDescription>
                    The system prompt given to the AI for chatbot conversations. Leave blank to auto-generate from workspace config.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={chatbotSystemPrompt}
                    onChange={(e) => setChatbotSystemPrompt(e.target.value)}
                    className="font-mono text-sm h-48"
                    placeholder="You are an AI assistant for [brand]. You help users discover relevant news about..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allowed Origins (CORS)</CardTitle>
                  <CardDescription>
                    Domains allowed to embed the chatbot widget. One per line. Localhost is always allowed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={allowedOriginsText}
                    onChange={(e) => setAllowedOriginsText(e.target.value)}
                    className="font-mono text-sm h-24"
                    placeholder={"https://example.com\nhttps://www.example.com"}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =================== EMAIL =================== */}
          <TabsContent value="email">
            <div className="mb-4">
              <EmailRecipientsManager />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Configure how outgoing emails appear to recipients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name</Label>
                    <Input
                      id="sender-name"
                      value={emailSenderName}
                      onChange={(e) => setEmailSenderName(e.target.value)}
                      placeholder="My Newsletter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-address">From Email</Label>
                    <Input
                      id="from-address"
                      type="email"
                      value={emailFromAddress}
                      onChange={(e) => setEmailFromAddress(e.target.value)}
                      placeholder="news@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dashboard-url">Dashboard URL</Label>
                  <Input
                    id="dashboard-url"
                    value={dashboardUrl}
                    onChange={(e) => setDashboardUrl(e.target.value)}
                    placeholder="https://app.example.com"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Language Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-lang">Primary Language</Label>
                  <Input
                    id="primary-lang"
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                    placeholder="en"
                    maxLength={5}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="bilingual"
                    checked={bilingualMode}
                    onCheckedChange={setBilingualMode}
                  />
                  <Label htmlFor="bilingual">Bilingual mode (send emails in 2 languages)</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =================== INTEGRATIONS =================== */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>WordPress</CardTitle>
                <CardDescription>
                  Connect to your WordPress site for auto-publishing. The App Password is stored in Supabase Secrets, not here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wp-url">WordPress Site URL</Label>
                  <Input
                    id="wp-url"
                    value={wordpressUrl}
                    onChange={(e) => setWordpressUrl(e.target.value)}
                    placeholder="https://example.com"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wp-username">WordPress Username</Label>
                  <Input
                    id="wp-username"
                    value={wordpressUsername}
                    onChange={(e) => setWordpressUsername(e.target.value)}
                    placeholder="admin"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  WordPress App Password must be set as the <code>WORDPRESS_APP_PASSWORD</code> environment variable in Supabase Edge Functions secrets.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
