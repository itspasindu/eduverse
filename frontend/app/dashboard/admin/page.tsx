import Link from "next/link";
import { fetchAdminOverview } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function AdminDashboardPage() {
  const token = await getServerAccessToken();
  let overview = null;
  let error: string | null = null;

  if (token) {
    try {
      overview = await fetchAdminOverview(token);
    } catch {
      error = "Could not load admin analytics. Check backend and admin role.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Platform analytics, user management, and content moderation.
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={overview?.total_users ?? 0} />
        <StatCard label="Total posts" value={overview?.total_posts ?? 0} />
        <StatCard
          label="Students"
          value={overview?.users_by_role?.student ?? 0}
        />
        <StatCard
          label="Teachers"
          value={overview?.users_by_role?.teacher ?? 0}
        />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <RoleBreakdown title="Users by role" data={overview?.users_by_role ?? {}} />
        <RoleBreakdown title="Posts by type" data={overview?.posts_by_type ?? {}} />
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm font-semibold">Quick actions</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/dashboard/admin/users" className="text-violet-600 hover:underline">
                Manage users & roles
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/admin/moderation"
                className="text-violet-600 hover:underline"
              >
                Moderate community posts
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </article>
  );
}

function RoleBreakdown({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  return (
    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {Object.entries(data).map(([key, count]) => (
          <li key={key} className="flex justify-between capitalize">
            <span>{key}</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {count}
            </span>
          </li>
        ))}
        {!Object.keys(data).length && (
          <li className="text-zinc-400">No data yet</li>
        )}
      </ul>
    </article>
  );
}
