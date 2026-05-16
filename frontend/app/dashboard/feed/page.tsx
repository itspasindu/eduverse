import { fetchFeedServer } from "@/lib/api-server";

export const metadata = { title: "Community Feed — EduVerse" };

export default async function FeedPage() {
  let posts: Awaited<ReturnType<typeof fetchFeedServer>> = [];
  let error: string | null = null;

  try {
    posts = await fetchFeedServer();
  } catch {
    error = "Could not load feed. Is the backend running?";
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Community Feed</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Discover memes and videos from learners and creators.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      {posts.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500">
          No posts yet. Be the first to publish from Meme Studio!
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.content_url}
                alt={post.caption ?? "Community post"}
                className="aspect-video w-full object-cover"
              />
              <section className="p-4">
                {post.caption && (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {post.caption}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-400">
                  {post.likes} likes · {post.comments} comments
                </p>
              </section>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
