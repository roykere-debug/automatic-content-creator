import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Workspace settings loaded from workspace_settings table.
 * All components read brand, theme, topics, etc. from here instead of hardcoded values.
 */
export interface WorkspaceConfig {
  workspace_id: string;
  brand_name: string;
  brand_tagline: string;
  brand_logo_url: string | null;
  industry_vertical: string;
  scan_keywords: string[];
  chatbot_topics: Array<{ key: string; labelHe: string; labelEn: string; emoji: string }>;
  chatbot_greeting: { he: string; en: string };
  theme_colors: {
    primary: string;
    primaryGlow: string;
    accent: string;
    accentGlow: string;
    background: string;
    surface: string;
    foreground: string;
    cardBg: string;
  };
  supported_languages: string[];
  primary_language: string;
  bilingual_mode: boolean;
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  workspace_id: "",
  brand_name: "AutoPilot Content",
  brand_tagline: "Content Intelligence",
  brand_logo_url: null,
  industry_vertical: "general",
  scan_keywords: [],
  chatbot_topics: [],
  chatbot_greeting: { he: "שלום!", en: "Hi!" },
  theme_colors: {
    primary: "#3b82f6",
    primaryGlow: "rgba(59, 130, 246, 0.2)",
    accent: "#10b981",
    accentGlow: "rgba(16, 185, 129, 0.2)",
    background: "#0f172a",
    surface: "#1e293b",
    foreground: "#e2e8f0",
    cardBg: "#1e293b",
  },
  supported_languages: ["en"],
  primary_language: "en",
  bilingual_mode: false,
};

interface WorkspaceContextType {
  config: WorkspaceConfig;
  workspaceId: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaceConfig = async () => {
    if (!user) {
      setConfig(DEFAULT_CONFIG);
      setIsLoading(false);
      return;
    }

    try {
      // Get user's workspace
      const { data: wsUser } = await supabase
        .from("workspace_users")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!wsUser) {
        setIsLoading(false);
        return;
      }

      setWorkspaceId(wsUser.workspace_id);

      // Get workspace settings
      const { data: settings, error } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("workspace_id", wsUser.workspace_id)
        .single();

      if (error || !settings) {
        console.error("Failed to load workspace settings:", error);
        setIsLoading(false);
        return;
      }

      setConfig({
        workspace_id: wsUser.workspace_id,
        brand_name: settings.brand_name || DEFAULT_CONFIG.brand_name,
        brand_tagline: settings.brand_tagline || DEFAULT_CONFIG.brand_tagline,
        brand_logo_url: settings.brand_logo_url || null,
        industry_vertical: settings.industry_vertical || DEFAULT_CONFIG.industry_vertical,
        scan_keywords: settings.scan_keywords || [],
        chatbot_topics: settings.chatbot_topics || [],
        chatbot_greeting: settings.chatbot_greeting || DEFAULT_CONFIG.chatbot_greeting,
        theme_colors: {
          ...DEFAULT_CONFIG.theme_colors,
          ...(settings.theme_colors || {}),
        },
        supported_languages: settings.supported_languages || ["en"],
        primary_language: settings.primary_language || "en",
        bilingual_mode: settings.bilingual_mode ?? false,
      });
    } catch (error) {
      console.error("Error loading workspace:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceConfig();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ config, workspaceId, isLoading, refetch: fetchWorkspaceConfig }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
