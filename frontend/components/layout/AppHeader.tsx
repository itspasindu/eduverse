import Link from "next/link";
import UserMenu from "@/components/layout/UserMenu";
import { fetchMe } from "@/lib/api-server";
import { createClient } from "@/lib/supabase/server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    "";
  let avatarUrl =
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;
  let role = (user?.user_metadata?.role as string) ?? "student";

  const token = await getServerAccessToken();
  if (token) {
    try {
      const profile = await fetchMe(token);
      fullName = profile.full_name ?? fullName;
      avatarUrl = profile.avatar_url ?? avatarUrl;
      role = profile.role ?? role;
    } catch {
      // Use auth metadata fallback
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-sm text-white">
            E
          </span>
          EduVerse
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <UserMenu
              email={user.email ?? ""}
              fullName={fullName}
              avatarUrl={avatarUrl}
              role={role}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 font-medium text-white shadow-sm"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
