import { supabaseConfigError } from "@/lib/supabase/env";

export default function SupabaseConfigBanner() {
  const error = supabaseConfigError();
  if (!error) return null;

  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <p className="font-semibold">Supabase not configured</p>
      <p className="mt-1">{error}</p>
      <p className="mt-2 text-xs opacity-90">
        Open the app at{" "}
        <a href="http://localhost:3000" className="underline">
          http://localhost:3000
        </a>{" "}
        (not a file:// URL). Restart <code className="text-xs">npm run dev</code>{" "}
        after editing <code className="text-xs">frontend/.env.local</code>.
      </p>
    </div>
  );
}
