import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAnonKey, requireSupabaseUrl } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    requireSupabaseUrl(),
    requireAnonKey(),
    {
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
    },
  );

  await supabase.auth.signOut();

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });

  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  });

  return response;
}
