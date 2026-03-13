import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Workspace settings loaded from workspace_settings via the get-workspace-id edge function.
 * workspace_settings is service-role only, so all frontend access goes through that function.
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
  isOnboardingNeeded: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaceConfig = useCallback(async () => {
    // Wait for auth to fully settle before calling the edge function.
    // Without this guard, functions.invoke fires before the session token
    // is committed to the Supabase client, resulting in a 401.
    if (authLoading) return;

    if (!user) {
      setConfig(DEFAULT_CONFIG);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      // Reset loading so ProtectedRoute shows a spinner while workspace data
      // is fetched after sign-in (avoids stale wsLoading=false from previous run).
      setIsLoading(true);

      // Explicitly get the session token and pass it in the request header.
      // Relying on functions.invoke to auto-attach the token causes a race
      // condition — the session may not be committed to the client yet.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log("DEBUG: Got session for get-workspace-id", { hasSession: !!session, hasToken: !!session?.access_token, sessionError });
      
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

    // #region agent log
    fetch('http://127.0.0.1:7524/ingest/44b4a7b7-7c2f-4dbb-a472-093799b50112',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b0f921'},body:JSON.stringify({sessionId:'b0f921',location:'WorkspaceContext.tsx:109',message:'get-workspace-id PRE-INVOKE',data:{hasToken: !!session.access_token},timestamp:Date.now(),runId:'run4',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

      // workspace_settings is service-role only — must use the edge function
      const { data, error: fnError } = await supabase.functions.invoke("get-workspace-id", {
        body: { action: "get" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      console.error("DEBUG: get-workspace-id result", { data, fnError });

      // Try to read actual response body if available on the error
      let errorBody = null;
      let realErrorMessage = "Edge Function returned a non-2xx status code";
      try {
        if (fnError && (fnError as any).context && typeof (fnError as any).context.clone === 'function') {
           errorBody = await (fnError as any).context.clone().json();
           if (errorBody?.error) realErrorMessage = errorBody.error;
           else if (errorBody?.message) realErrorMessage = errorBody.message;
        }
      } catch (e) {
         console.error("Failed to parse error body", e);
      }

      // #region agent log
      fetch('http://127.0.0.1:7524/ingest/44b4a7b7-7c2f-4dbb-a472-093799b50112',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b0f921'},body:JSON.stringify({sessionId:'b0f921',location:'WorkspaceContext.tsx:108',message:'get-workspace-id result',data:{fnErrorStr: String(fnError), data, errorBody, realErrorMessage},timestamp:Date.now(),runId:'run7',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (fnError) {
      console.error("get-workspace-id error:", JSON.stringify(fnError), fnError);
      
      // Detailed error response reading
      try {
        if (fnError?.context) {
          const body = await (fnError.context as Response).clone().json();
          console.error("get-workspace-id error body:", body);
        } else if (fnError?.cause) {
            console.error("get-workspace-id error cause:", fnError.cause);
        }
      } catch (e) {
        console.error("Failed to read error body:", e);
      }
      
      const status = (fnError as { context?: { status?: number } }).context?.status;
      // 401/403 — token issue or missing role. Use default config so the user
      // isn't stuck in a sign-out loop. They'll see default branding.
      if (status === 401 || status === 403 || String(fnError).includes('Failed to fetch')) {
        // Session mismatch or CORS network error — use default config and let user stay logged in.
          // They will get proper workspace config once Vercel deploys with the
          // correct Supabase credentials and they sign in fresh.
          console.warn(`Workspace load returned ${status} — using default config.`);
          setIsLoading(false);
          return;
        }
        const errorMsg = `Failed to load workspace: ${fnError.message || "Unknown error"} (HTTP ${status ?? "?"})`;
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      if (!data?.workspaceId) {
        // No workspace exists yet — leave workspaceId as null so
        // ProtectedRoute redirects to /onboarding to set one up.
        setWorkspaceId(null);
        setIsLoading(false);
        return;
      }

      const { workspaceId: wsId, settings } = data as {
        workspaceId: string;
        settings: Record<string, unknown> | null;
      };

      setWorkspaceId(wsId);

      if (!settings) {
        setIsLoading(false);
        return;
      }

      setConfig({
        workspace_id: wsId,
        brand_name: (settings.brand_name as string) ?? DEFAULT_CONFIG.brand_name,
        brand_tagline: (settings.brand_tagline as string) ?? DEFAULT_CONFIG.brand_tagline,
        brand_logo_url: (settings.brand_logo_url as string | null) ?? null,
        industry_vertical: (settings.industry_vertical as string) ?? DEFAULT_CONFIG.industry_vertical,
        scan_keywords: (settings.scan_keywords as string[]) ?? [],
        chatbot_topics: (settings.chatbot_topics as WorkspaceConfig["chatbot_topics"]) ?? [],
        chatbot_greeting:
          (settings.chatbot_greeting as WorkspaceConfig["chatbot_greeting"]) ??
          DEFAULT_CONFIG.chatbot_greeting,
        theme_colors: {
          ...DEFAULT_CONFIG.theme_colors,
          ...((settings.theme_colors as Partial<WorkspaceConfig["theme_colors"]>) || {}),
        },
        supported_languages: (settings.supported_languages as string[]) ?? ["en"],
        primary_language: (settings.primary_language as string) ?? "en",
        bilingual_mode: (settings.bilingual_mode as boolean) ?? false,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error loading workspace";
      console.error("WorkspaceContext error:", err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchWorkspaceConfig();
  }, [fetchWorkspaceConfig]);

  // Onboarding needed if: no workspace exists yet, OR workspace has no scan keywords configured
  const isOnboardingNeeded = user !== null && !isLoading && (workspaceId === null || config.scan_keywords.length === 0);

  return (
    <WorkspaceContext.Provider
      value={{ config, workspaceId, isLoading, isOnboardingNeeded, error, refetch: fetchWorkspaceConfig }}
    >
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
