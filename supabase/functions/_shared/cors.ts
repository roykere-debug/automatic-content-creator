import type { WorkspaceSettings } from "./workspace-loader.ts";

/**
 * Build CORS headers dynamically from workspace settings.
 * Replaces the hardcoded ALLOWED_ORIGINS.
 */
export function getCorsHeaders(
  origin: string | null,
  settings: WorkspaceSettings | null
): Record<string, string> {
  const allowedOrigins = settings?.chatbot_allowed_origins || [];

  // Always allow localhost in development
  const devOrigins = ["http://localhost:5173", "http://localhost:3000"];
  const allAllowed = [...allowedOrigins, ...devOrigins];

  const isAllowed = origin
    ? allAllowed.includes(origin) ||
      origin.endsWith(".lovableproject.com") ||
      origin.endsWith(".lovable.dev") ||
      origin.endsWith(".lovable.app")
    : false;

  const allowedOrigin = isAllowed && origin ? origin : (allowedOrigins[0] || "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

/**
 * Open CORS headers for admin-only endpoints (auth-protected).
 */
export const openCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Check if an origin is allowed for a workspace.
 */
export function isOriginAllowed(origin: string, settings: WorkspaceSettings): boolean {
  const devOrigins = ["http://localhost:5173", "http://localhost:3000"];
  return (
    settings.chatbot_allowed_origins.includes(origin) ||
    devOrigins.includes(origin) ||
    origin.endsWith(".lovableproject.com") ||
    origin.endsWith(".lovable.dev") ||
    origin.endsWith(".lovable.app")
  );
}
