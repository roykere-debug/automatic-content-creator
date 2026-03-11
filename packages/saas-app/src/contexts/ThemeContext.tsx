import { useEffect } from "react";
import { useWorkspace } from "./WorkspaceContext";

/**
 * ThemeProvider — injects CSS variables from workspace_settings.theme_colors.
 * Replaces hardcoded --tactical-green and military theme.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { config } = useWorkspace();

  useEffect(() => {
    const root = document.documentElement;
    const { theme_colors } = config;

    // Inject workspace theme colors as CSS variables
    root.style.setProperty("--brand-primary", theme_colors.primary);
    root.style.setProperty("--brand-primary-glow", theme_colors.primaryGlow);
    root.style.setProperty("--brand-accent", theme_colors.accent);
    root.style.setProperty("--brand-accent-glow", theme_colors.accentGlow);
    root.style.setProperty("--brand-background", theme_colors.background);
    root.style.setProperty("--brand-surface", theme_colors.surface);
    root.style.setProperty("--brand-foreground", theme_colors.foreground);
    root.style.setProperty("--brand-card-bg", theme_colors.cardBg);
  }, [config.theme_colors]);

  return <>{children}</>;
}
