import { fetchMyPostsServer } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";
import LibraryGrid from "@/components/dashboard/LibraryGrid";

export const metadata = { title: "My Library — EduVerse" };

export default async function LibraryPage() {
  const accessToken = await getServerAccessToken();

  let posts: Awaited<ReturnType<typeof fetchMyPostsServer>> = [];
  let error: string | null = null;

  if (accessToken) {
    try {
      posts = await fetchMyPostsServer(accessToken);
    } catch {
      error = "Could not load your library.";
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Library</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All memes and videos you have saved.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      <LibraryGrid initialPosts={posts} />
    </>
  );
}
