/** Allow only same-origin relative paths (blocks open redirects). */

export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://") || path.includes("\\")) return fallback;
  return path;
}
