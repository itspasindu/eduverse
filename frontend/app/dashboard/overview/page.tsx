import Link from "next/link";
import { fetchDashboard } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export const metadata = { title: "Overview — EduVerse" };

export default async function OverviewPage() {
  const accessToken = await getServerAccessToken();

  let dashboard = null;
  let error: string | null = null;

  if (accessToken) {
    try {
      dashboard = await fetchDashboard(accessToken);
    } catch {
      error =
        "Could not load stats. Ensure the backend is running and SUPABASE_JWT_SECRET / service role are set in backend/.env.";
    }
  } else {
    error = "Not signed in. Try signing out and back in.";
  }

  const name =
    dashboard?.user.full_name ||
    dashboard?.user.email?.split("@")[0] ||
    "there";

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Hello, {name} 👋</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your learning workspace — role:{" "}
          <span className="capitalize">{dashboard?.user.role ?? "student"}</span>
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total posts" value={dashboard?.stats.total_posts ?? 0} />
        <StatCard label="Memes" value={dashboard?.stats.meme_count ?? 0} />
        <StatCard label="Videos" value={dashboard?.stats.video_count ?? 0} />
        <StatCard label="Likes received" value={dashboard?.stats.total_likes ?? 0} />
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          href="/dashboard/slides"
          title="Slide Studio"
          desc="Notes → slides with images"
        />
        <QuickLink href="/dashboard/meme" title="Meme Studio" desc="Generate a study meme" />
        <QuickLink href="/dashboard/tutor" title="AI Tutor" desc="Ask anything" />
        <QuickLink href="/dashboard/library" title="My Library" desc="Your saved work" />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent creations</h2>
        {dashboard?.recent_posts.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {dashboard.recent_posts.map((post) => (
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
                  <p className="p-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {post.caption}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No posts yet.{" "}
            <Link href="/dashboard/meme" className="text-violet-600 hover:underline">
              Create your first meme
            </Link>
          </p>
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

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-violet-200/60 bg-violet-50/50 p-4 transition hover:border-violet-400 dark:border-violet-900/50 dark:bg-violet-950/30"
    >
      <p className="font-semibold text-violet-900 dark:text-violet-100">{title}</p>
      <p className="mt-1 text-sm text-violet-700/80 dark:text-violet-300/80">{desc}</p>
    </Link>
  );
}
