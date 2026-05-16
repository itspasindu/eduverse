import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const supabaseKey =
    anonKey && !anonKey.includes("REPLACE_WITH") && !anonKey.startsWith("sb_secret_")
      ? anonKey
      : serviceKey!;

  return createServerClient(url, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; middleware handles refresh.
        }
      },
    },
  });
}
