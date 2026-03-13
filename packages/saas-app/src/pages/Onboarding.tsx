import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  Shield,
  TrendingUp,
  Heart,
  BookOpen,
  Newspaper,
  Globe,
  Loader2,
  Sparkles,
  Mail,
  Languages,
  Tag,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

interface Industry {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const INDUSTRIES: Industry[] = [
  {
    id: "defense-tech",
    label: "Defense Tech",
    description: "Military, aerospace & security systems",
    icon: Shield,
    color: "text-blue-400",
  },
  {
    id: "fintech",
    label: "Fintech",
    description: "Payments, banking & capital markets",
    icon: TrendingUp,
    color: "text-green-400",
  },
  {
    id: "healthtech",
    label: "Health Tech",
    description: "Medical devices, diagnostics & biotech",
    icon: Heart,
    color: "text-rose-400",
  },
  {
    id: "edtech",
    label: "Ed Tech",
    description: "Learning platforms & academic tools",
    icon: BookOpen,
    color: "text-amber-400",
  },
  {
    id: "media",
    label: "Media",
    description: "Publishing, content & journalism",
    icon: Newspaper,
    color: "text-purple-400",
  },
  {
    id: "general",
    label: "General",
    description: "Startups, technology & innovation",
    icon: Globe,
    color: "text-cyan-400",
  },
];

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "defense-tech": [
    "drone",
    "missile defense",
    "cybersecurity",
    "autonomous systems",
    "military AI",
    "radar",
    "surveillance",
    "electronic warfare",
    "robotics",
    "C4ISR",
    "naval defense",
    "space defense",
  ],
  fintech: [
    "blockchain",
    "payments",
    "DeFi",
    "neobank",
    "crypto",
    "open banking",
    "RegTech",
    "embedded finance",
    "CBDC",
    "insurtech",
    "investment platform",
    "digital wallet",
  ],
  healthtech: [
    "digital health",
    "medtech",
    "AI diagnostics",
    "wearables",
    "telemedicine",
    "genomics",
    "clinical trials",
    "remote patient monitoring",
    "drug discovery",
    "health data",
    "biomarkers",
    "precision medicine",
  ],
  edtech: [
    "online learning",
    "LMS",
    "AI tutor",
    "adaptive learning",
    "MOOC",
    "upskilling",
    "coding bootcamp",
    "corporate training",
    "e-learning",
    "virtual classroom",
    "micro-credentials",
    "gamification",
  ],
  media: [
    "journalism",
    "content marketing",
    "newsletter",
    "podcast",
    "creator economy",
    "social media",
    "digital publishing",
    "streaming",
    "OTT",
    "media startup",
    "audience growth",
    "monetization",
  ],
  general: [
    "startup funding",
    "AI",
    "SaaS",
    "venture capital",
    "product launch",
    "Series A",
    "tech innovation",
    "deep tech",
    "B2B software",
    "platform economy",
    "cloud computing",
    "machine learning",
  ],
};

// ─── Step components ──────────────────────────────────────────────────────────

interface StepWelcomeProps {
  brandName: string;
  brandTagline: string;
  onChange: (field: "brandName" | "brandTagline", value: string) => void;
}

function StepWelcome({ brandName, brandTagline, onChange }: StepWelcomeProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome to AutoPilot Content
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Let's set up your workspace in a few quick steps. Start by telling us
          about your brand.
        </p>
      </div>

      <div className="space-y-5 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="brand-name" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Brand Name
          </Label>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(e) => onChange("brandName", e.target.value)}
            placeholder="e.g. TechBriefing, DefenseWatch..."
            className="h-11 text-base bg-surface border-border focus:border-primary"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand-tagline" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Tagline
            <span className="ml-2 text-muted-foreground/60 normal-case font-normal">optional</span>
          </Label>
          <Input
            id="brand-tagline"
            value={brandTagline}
            onChange={(e) => onChange("brandTagline", e.target.value)}
            placeholder="e.g. Defense intelligence, delivered daily"
            className="h-11 text-base bg-surface border-border focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

interface StepIndustryProps {
  selected: string;
  onSelect: (id: string) => void;
}

function StepIndustry({ selected, onSelect }: StepIndustryProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          What's your industry?
        </h2>
        <p className="text-muted-foreground">
          We'll tailor your content pipeline and keyword suggestions.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isSelected = selected === industry.id;
          return (
            <button
              key={industry.id}
              onClick={() => onSelect(industry.id)}
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                  : "border-border bg-surface hover:border-primary/40 hover:bg-surface/80"
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <Icon className={cn("h-6 w-6", industry.color)} />
              <div>
                <p className="font-semibold text-sm">{industry.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {industry.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StepKeywordsProps {
  industry: string;
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

function StepKeywords({ industry, keywords, onChange }: StepKeywordsProps) {
  const [input, setInput] = useState("");
  const suggestions = INDUSTRY_KEYWORDS[industry] || INDUSTRY_KEYWORDS.general;

  const toggle = (kw: string) => {
    if (keywords.includes(kw)) {
      onChange(keywords.filter((k) => k !== kw));
    } else {
      onChange([...keywords, kw]);
    }
  };

  const addCustom = () => {
    const trimmed = input.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    onChange([...keywords, trimmed]);
    setInput("");
  };

  const remove = (kw: string) => onChange(keywords.filter((k) => k !== kw));

  const customKeywords = keywords.filter((k) => !suggestions.includes(k));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Choose your topics
        </h2>
        <p className="text-muted-foreground">
          These keywords drive your content scans. Select as many as you want.
        </p>
      </div>

      {/* Suggested keywords */}
      <div className="space-y-2">
        <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="h-3 w-3" />
          Suggested for{" "}
          {INDUSTRIES.find((i) => i.id === industry)?.label || "your industry"}
        </Label>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((kw) => {
            const isSelected = keywords.includes(kw);
            return (
              <button
                key={kw}
                onClick={() => toggle(kw)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150",
                  isSelected
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-surface border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
                {kw}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom keyword input */}
      <div className="space-y-2">
        <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Add custom keyword
        </Label>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Type a keyword and press Enter..."
            className="flex-1 h-9 bg-surface border-border focus:border-primary"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={addCustom}
            disabled={!input.trim()}
            className="h-9 w-9 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {customKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {customKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-accent/20 border border-accent/40 text-accent"
              >
                {kw}
                <button
                  onClick={() => remove(kw)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Selection count */}
      <div className="flex items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground">
          {keywords.length === 0
            ? "No keywords selected yet"
            : `${keywords.length} keyword${keywords.length === 1 ? "" : "s"} selected`}
        </span>
      </div>
    </div>
  );
}

interface StepLanguageProps {
  primaryLanguage: string;
  bilingualMode: boolean;
  onChange: (field: "primaryLanguage" | "bilingualMode", value: string | boolean) => void;
}

function StepLanguage({ primaryLanguage, bilingualMode, onChange }: StepLanguageProps) {
  const languages = [
    { code: "en", label: "English", flag: "🇺🇸", description: "Articles and emails in English" },
    { code: "he", label: "עברית", flag: "🇮🇱", description: "כתבות ומיילים בעברית" },
    { code: "ar", label: "العربية", flag: "🇸🇦", description: "مقالات ورسائل بالعربية" },
    { code: "de", label: "Deutsch", flag: "🇩🇪", description: "Artikel und E-Mails auf Deutsch" },
    { code: "fr", label: "Français", flag: "🇫🇷", description: "Articles et e-mails en français" },
    { code: "es", label: "Español", flag: "🇪🇸", description: "Artículos y correos en español" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Language preferences
        </h2>
        <p className="text-muted-foreground">
          Set your primary content language and optional bilingual mode.
        </p>
      </div>

      {/* Language selection */}
      <div className="space-y-2">
        <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Languages className="h-3 w-3" />
          Primary language
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {languages.map((lang) => {
            const isSelected = primaryLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onChange("primaryLanguage", lang.code)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.02]",
                  isSelected
                    ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                    : "border-border bg-surface hover:border-primary/40"
                )}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div>
                  <p className="font-semibold text-sm">{lang.label}</p>
                  <p className="text-[10px] text-muted-foreground">{lang.code.toUpperCase()}</p>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bilingual mode */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Bilingual mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate and send content in two languages simultaneously.
              Ideal for multi-region audiences.
            </p>
          </div>
          <Switch
            checked={bilingualMode}
            onCheckedChange={(checked) => onChange("bilingualMode", checked)}
            className="shrink-0"
          />
        </div>
        {bilingualMode && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-primary font-mono">
              ✓ Articles will be generated in English + Hebrew by default
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepEmailProps {
  senderName: string;
  fromAddress: string;
  onChange: (field: "senderName" | "fromAddress", value: string) => void;
}

function StepEmail({ senderName, fromAddress, onChange }: StepEmailProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Email setup
        </h2>
        <p className="text-muted-foreground">
          Configure how your content emails appear to recipients.
          You can skip this and configure it in Settings later.
        </p>
      </div>

      <div className="space-y-5 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="sender-name" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Sender Name
          </Label>
          <Input
            id="sender-name"
            value={senderName}
            onChange={(e) => onChange("senderName", e.target.value)}
            placeholder="e.g. TechBriefing Newsletter"
            className="h-11 text-base bg-surface border-border focus:border-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="from-address" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            From Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="from-address"
              type="email"
              value={fromAddress}
              onChange={(e) => onChange("fromAddress", e.target.value)}
              placeholder="news@yourcompany.com"
              className="h-11 text-base bg-surface border-border focus:border-primary pl-10"
              dir="ltr"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Must be a verified domain in Resend. Leave blank to use the default.
          </p>
        </div>
      </div>
    </div>
  );
}

interface StepDoneProps {
  brandName: string;
  industry: string;
  keywords: string[];
  primaryLanguage: string;
  bilingualMode: boolean;
  senderName: string;
}

function StepDone({ brandName, industry, keywords, primaryLanguage, bilingualMode, senderName }: StepDoneProps) {
  const industryLabel = INDUSTRIES.find((i) => i.id === industry)?.label || industry;
  const langMap: Record<string, string> = { en: "English", he: "Hebrew", ar: "Arabic", de: "German", fr: "French", es: "Spanish" };

  const summaryItems = [
    { icon: Sparkles, label: "Brand", value: brandName || "AutoPilot Content" },
    { icon: Globe, label: "Industry", value: industryLabel },
    { icon: Tag, label: "Keywords", value: `${keywords.length} topics configured` },
    { icon: Languages, label: "Language", value: `${langMap[primaryLanguage] || primaryLanguage}${bilingualMode ? " + bilingual" : ""}` },
    ...(senderName ? [{ icon: Mail, label: "Sender", value: senderName }] : []),
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        {/* Animated checkmark */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 border border-primary/50">
            <Check className="h-7 w-7 text-primary" strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          You're all set!
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your workspace has been personalized. Here's a summary of what we configured:
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
        {summaryItems.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-sm font-medium truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can always change these settings in the{" "}
        <span className="text-primary">Settings</span> page.
      </p>
    </div>
  );
}

// ─── Main Onboarding page ─────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { workspaceId, refetch } = useWorkspace();

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [brandTagline, setBrandTagline] = useState("");
  const [industry, setIndustry] = useState("general");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [bilingualMode, setBilingualMode] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [fromAddress, setFromAddress] = useState("");

  const handleStep1Change = useCallback(
    (field: "brandName" | "brandTagline", value: string) => {
      if (field === "brandName") setBrandName(value);
      else setBrandTagline(value);
    },
    []
  );

  const handleStep4Change = useCallback(
    (field: "primaryLanguage" | "bilingualMode", value: string | boolean) => {
      if (field === "primaryLanguage") setPrimaryLanguage(value as string);
      else setBilingualMode(value as boolean);
    },
    []
  );

  const handleStep5Change = useCallback(
    (field: "senderName" | "fromAddress", value: string) => {
      if (field === "senderName") setSenderName(value);
      else setFromAddress(value);
    },
    []
  );

  // When industry changes, reset keyword suggestions
  const handleIndustrySelect = useCallback((id: string) => {
    setIndustry(id);
    // Keep custom keywords, drop old suggestions
    setKeywords((prev) => {
      const prevSuggestions = INDUSTRY_KEYWORDS[industry] || [];
      const custom = prev.filter((k) => !prevSuggestions.includes(k));
      return custom;
    });
  }, [industry]);

  const canAdvance = (): boolean => {
    if (step === 1) return brandName.trim().length > 0;
    if (step === 2) return industry.length > 0;
    if (step === 3) return keywords.length >= 1;
    return true;
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Explicitly get session token just like we do in WorkspaceContext
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("DEBUG Onboarding API: No session", { sessionError });
        throw new Error("No active session. Please sign in again.");
      }

      // All workspace_settings writes go through the edge function (service-role only table)
      const { data, error } = await supabase.functions.invoke("get-workspace-id", {
        body: {
          action: "update",
          // workspaceId is optional — the function resolves it if not provided
          ...(workspaceId && { workspaceId }),
          settings: {
            brand_name: brandName || "AutoPilot Content",
            brand_tagline: brandTagline || "Content Intelligence",
            industry_vertical: industry,
            scan_keywords: keywords,
            primary_language: primaryLanguage,
            bilingual_mode: bilingualMode,
            supported_languages: bilingualMode
              ? [...new Set([primaryLanguage, primaryLanguage === "he" ? "en" : "he"])]
              : [primaryLanguage],
            ...(senderName && { email_sender_name: senderName }),
            ...(fromAddress && { email_from_address: fromAddress }),
          },
        },
        headers: { 
          Authorization: `Bearer ${session.access_token}` 
        },
      });

      console.error("DEBUG Onboarding API response", { data, error });

      // Try to read actual response body if available on the error
      let errorBody = null;
      let realErrorMessage = "Edge Function returned a non-2xx status code";
      try {
        if (error && (error as any).context && typeof (error as any).context.clone === 'function') {
           errorBody = await (error as any).context.clone().json();
           if (errorBody?.error) realErrorMessage = errorBody.error;
           else if (errorBody?.message) realErrorMessage = errorBody.message;
        } else if (error && (error as any).message) {
            // For network errors like 401s that the supabase client returns
            realErrorMessage = (error as any).message;
        }
      } catch (e) {
         console.error("Failed to parse error body", e);
      }

      // #region agent log
      fetch('http://127.0.0.1:7524/ingest/44b4a7b7-7c2f-4dbb-a472-093799b50112',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b0f921'},body:JSON.stringify({sessionId:'b0f921',location:'Onboarding.tsx:715',message:'Onboarding API error',data:{errorStr: String(error), data, errorBody, realErrorMessage},timestamp:Date.now(),runId:'run6',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

    } catch (err) {
      console.error("Onboarding save error:", err);
      let errorDesc = err instanceof Error ? err.message : String(err);
      if (errorDesc === 'Failed to fetch' || errorDesc.includes('CORS') || errorDesc.includes('Edge Function returned a non-2xx status code')) {
          errorDesc = "Network error. The Edge Function couldn't be reached or returned an invalid token (401). Try signing out and signing in again.";
      }
      toast.error("Failed to save settings", {
        description: errorDesc,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const next = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleFinish();
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const stepLabels = ["Brand", "Industry", "Keywords", "Language", "Email", "Done"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {/* Step labels */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">
              SETUP WIZARD
            </span>
            <span className="font-mono text-xs text-primary">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-between">
            {stepLabels.map((label, idx) => {
              const stepNum = idx + 1;
              const isDone = stepNum < step;
              const isCurrent = stepNum === step;
              return (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full transition-all duration-300",
                      isDone
                        ? "bg-primary scale-100"
                        : isCurrent
                        ? "bg-primary scale-125 shadow-sm shadow-primary/50"
                        : "bg-border"
                    )}
                  />
                  <span
                    className={cn(
                      "font-mono text-[9px] uppercase tracking-wider hidden sm:block",
                      isCurrent ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground/50"
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8">
        <div className="max-w-2xl mx-auto w-full">
          <div
            key={step}
            className="animate-fade-in"
          >
            {step === 1 && (
              <StepWelcome
                brandName={brandName}
                brandTagline={brandTagline}
                onChange={handleStep1Change}
              />
            )}
            {step === 2 && (
              <StepIndustry
                selected={industry}
                onSelect={handleIndustrySelect}
              />
            )}
            {step === 3 && (
              <StepKeywords
                industry={industry}
                keywords={keywords}
                onChange={setKeywords}
              />
            )}
            {step === 4 && (
              <StepLanguage
                primaryLanguage={primaryLanguage}
                bilingualMode={bilingualMode}
                onChange={handleStep4Change}
              />
            )}
            {step === 5 && (
              <StepEmail
                senderName={senderName}
                fromAddress={fromAddress}
                onChange={handleStep5Change}
              />
            )}
            {step === 6 && (
              <StepDone
                brandName={brandName}
                industry={industry}
                keywords={keywords}
                primaryLanguage={primaryLanguage}
                bilingualMode={bilingualMode}
                senderName={senderName}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          {/* Back */}
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 1}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Skip (email step only) */}
          {step === 5 && (
            <Button
              variant="ghost"
              onClick={() => setStep(6)}
              className="text-muted-foreground text-sm"
            >
              Skip for now
            </Button>
          )}

          {/* Next / Finish */}
          <Button
            onClick={next}
            disabled={!canAdvance() || isSaving}
            className={cn(
              "gap-2 min-w-[120px]",
              step === TOTAL_STEPS && "bg-primary hover:bg-primary/90"
            )}
            variant={step === TOTAL_STEPS ? "tactical" : "default"}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : step === TOTAL_STEPS ? (
              <>
                <Zap className="h-4 w-4" />
                Go to Dashboard
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
