import Link from "next/link";
import SettingsForm from "@/components/dashboard/SettingsForm";
import { fetchMe, fetchMySubscriptionServer } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings — EduVerse" };

export default async function SettingsPage() {
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
  let subscription = null;
  if (token) {
    try {
      const profile = await fetchMe(token);
      fullName = profile.full_name ?? fullName;
      avatarUrl = profile.avatar_url ?? avatarUrl;
      role = profile.role ?? role;
    } catch {
      // Use auth metadata
    }
    try {
      subscription = await fetchMySubscriptionServer(token);
    } catch {
      /* optional */
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update your display name and profile photo.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Subscription
        </h2>
        {subscription ? (
          <div className="mt-3">
            <p className="text-lg font-semibold">{subscription.plan.name}</p>
            <p className="text-sm capitalize text-zinc-500">Status: {subscription.status}</p>
            {subscription.status === "pending" && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Waiting for admin activation. You can still use Starter features once approved.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No plan selected yet.
          </p>
        )}
        <Link
          href="/choose-plan"
          className="mt-4 inline-block text-sm font-medium text-violet-600 hover:underline"
        >
          Change plan
        </Link>
        {" · "}
        <Link href="/pricing" className="text-sm font-medium text-violet-600 hover:underline">
          View pricing
        </Link>
      </section>

      <SettingsForm
        email={user?.email ?? ""}
        fullName={fullName}
        role={role}
        avatarUrl={avatarUrl}
      />
    </>
  );
}
