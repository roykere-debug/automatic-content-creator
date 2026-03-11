/**
 * Rate limiting utilities — workspace-agnostic.
 */

/**
 * Hash an IP address with a salt for privacy-preserving rate limiting.
 * Uses Web Crypto API (available in Deno and modern browsers).
 */
export async function hashIP(ip: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32);
}

/**
 * Check if a domain is in a blacklist (including paywall sites).
 */
export function isDomainBlacklisted(url: string, blacklist: readonly string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blacklist.some((site) => hostname.includes(site));
  } catch {
    return false;
  }
}

/**
 * Check if a URL has already been used (by normalizing and comparing).
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}
