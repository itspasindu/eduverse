const DEFAULT_HOSTS = [
  "picsum.photos",
  "fal.media",
  "fal.run",
  "supabase.co",
];

function allowedHosts(): string[] {
  const extra = process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS?.split(",") ?? [];
  return [...DEFAULT_HOSTS, ...extra.map((h) => h.trim().toLowerCase())].filter(
    Boolean,
  );
}

export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return allowedHosts().some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}
