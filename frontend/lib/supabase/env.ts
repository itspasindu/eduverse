/** Resolve Supabase env vars — supports both NEXT_PUBLIC_* and unprefixed names. */

function pick(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

const PLACEHOLDERS = [
  "your-project",
  "YOUR_PROJECT",
  "your-anon",
  "your-anon-key",
  "REPLACE_WITH",
];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDERS.some((p) => lower.includes(p.toLowerCase()));
}

export function isValidAnonKey(key: string): boolean {
  if (!key || isPlaceholder(key)) return false;
  if (key.startsWith("sb_secret_")) return false;
  if (key.startsWith("your-")) return false;
  return key.startsWith("eyJ") || key.startsWith("sb_publishable_");
}

/** Prefer a valid key over first-defined (avoids stale NEXT_PUBLIC placeholders). */
export function getSupabaseAnonKey(): string {
  const plain = process.env.SUPABASE_ANON_KEY?.trim() ?? "";
  const next = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (isValidAnonKey(plain)) return plain;
  if (isValidAnonKey(next)) return next;
  return pick(next, plain);
}

export function getSupabaseUrl(): string {
  const plain = process.env.SUPABASE_URL?.trim() ?? "";
  const next = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const pickValid = (u: string) => u && !isPlaceholder(u);
  if (pickValid(plain)) return plain;
  if (pickValid(next)) return next;
  return pick(next, plain);
}

export function getAnonKeySource(): "next_public" | "supabase" | "none" {
  const plain = process.env.SUPABASE_ANON_KEY?.trim() ?? "";
  const next = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (isValidAnonKey(plain)) return "supabase";
  if (isValidAnonKey(next)) return "next_public";
  return "none";
}

export function getSupabasePublicEnv() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const urlInvalid = !url || isPlaceholder(url);
  const keyInvalid = !isValidAnonKey(anonKey);

  return {
    url,
    anonKey,
    urlInvalid,
    keyInvalid,
    isConfigured: !urlInvalid && !keyInvalid,
    anonKeySource: getAnonKeySource(),
  };
}

export function requireSupabaseUrl(): string {
  const url = getSupabaseUrl();
  if (!url || isPlaceholder(url)) {
    throw new Error(
      "Supabase URL missing. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in frontend/.env.local",
    );
  }
  return url;
}

export function requireAnonKey(): string {
  const key = getSupabaseAnonKey();
  if (!isValidAnonKey(key)) {
    throw new Error(
      "Supabase anon key missing or invalid. Set SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local (publishable public key, not sb_secret_ or service_role).",
    );
  }
  return key;
}

export function supabaseConfigError(): string | null {
  const { urlInvalid, keyInvalid, anonKeySource } = getSupabasePublicEnv();
  if (urlInvalid && keyInvalid) {
    return "Supabase URL and anon key are missing. Copy them from Supabase Dashboard → API into frontend/.env.local (SUPABASE_URL + SUPABASE_ANON_KEY).";
  }
  if (urlInvalid) {
    return "Supabase URL is missing. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in frontend/.env.local";
  }
  if (keyInvalid) {
    if (anonKeySource === "none") {
      const raw = pick(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        process.env.SUPABASE_ANON_KEY,
      );
      if (raw.includes("REPLACE_WITH")) {
        return "Anon key is still a placeholder. Set SUPABASE_ANON_KEY to your publishable key (same as backend/.env).";
      }
    }
    return "Supabase anon key is missing or invalid. Use the publishable / anon public key (eyJ... or sb_publishable_...).";
  }
  return null;
}
