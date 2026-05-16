import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAnonKey, requireSupabaseUrl } from "@/lib/supabase/env";

export { requireAnonKey, requireSupabaseUrl };

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  return createServerClient(requireSupabaseUrl(), requireAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

export function friendlyAuthMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (lower.includes("password") && lower.includes("weak")) {
    return "Password is too weak. Use at least 8 characters with mixed characters.";
  }
  if (lower.includes("profiles") || lower.includes("foreign key")) {
    return "Database setup issue: run supabase/migrations in the Supabase SQL Editor (001 and 004), then try again.";
  }
  if (lower.includes("signups not allowed") || lower.includes("signup is disabled")) {
    return "Email signups are disabled in Supabase. Enable Auth → Email provider in your project.";
  }
  return message;
}
