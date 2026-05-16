import Link from "next/link";
import { fetchTeacherOverview } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function TeacherDashboardPage() {
  const token = await getServerAccessToken();
  let data = null;
  let error: string | null = null;

  if (token) {
    try {
      data = await fetchTeacherOverview(token);
    } catch {
      error = "Could not load teacher dashboard. Ensure teacher role and migration 005.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your class, publish announcements, and track community activity.
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={data?.student_count ?? 0} />
        <StatCard label="Creators" value={data?.creator_count ?? 0} />
        <StatCard label="Community posts" value={data?.total_posts ?? 0} />
        <StatCard label="My announcements" value={data?.my_announcements ?? 0} />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/teacher/students"
          className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4 hover:border-emerald-400 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        >
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">
            Student roster
          </p>
          <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-300/80">
            View enrolled students and contact emails
          </p>
        </Link>
        <Link
          href="/dashboard/teacher/announcements"
          className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-4 hover:border-violet-400 dark:border-violet-900/50 dark:bg-violet-950/30"
        >
          <p className="font-semibold text-violet-900 dark:text-violet-100">
            Class announcements
          </p>
          <p className="mt-1 text-sm text-violet-700/80 dark:text-violet-300/80">
            Broadcast updates to all students
          </p>
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Recent announcements</h2>
        {data?.recent_announcements.length ? (
          <ul className="space-y-2">
            {data.recent_announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{a.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No announcements yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Trending community posts</h2>
        {data?.recent_posts.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {data.recent_posts.map((post) => (
              <li
                key={post.id}
                className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.content_url}
                  alt={post.caption ?? "Post"}
                  className="aspect-video w-full object-cover"
                />
                {post.caption && (
                  <p className="p-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {post.caption}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">No community posts yet.</p>
        )}
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
