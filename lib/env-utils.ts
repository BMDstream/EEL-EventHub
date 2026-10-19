/**
 * Client-side and server-side utilities for robust environment detection
 * and database isolation between Production (neondb) and Preview (neondb_preview).
 */

export function isClientPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();

  // Canonical production domains are NEVER preview
  if (
    host === "eel-event-hub-q61e.vercel.app" ||
    host.includes("bmdcomputing.com") ||
    host.includes("rydexgroup.co.za")
  ) {
    return false;
  }

  // Any preview deployment, branch alias, or local development host
  return (
    host.endsWith(".vercel.app") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("preview") ||
    host.includes("-git-")
  );
}

/**
 * Returns an object with the required headers for preview environment routing
 * if currently running on a preview host.
 */
export function getAppEnvironmentHeaders(): Record<string, string> {
  if (isClientPreviewHost()) {
    return { "x-app-environment": "preview" };
  }
  return {};
}
