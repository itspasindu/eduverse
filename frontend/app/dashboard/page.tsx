import CommunityFeedClient from "@/components/community/CommunityFeedClient";
import { fetchFeedServer, fetchMe } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export const metadata = { title: "Community — EduVerse" };

export default async function CommunityHomePage() {
  const token = await getServerAccessToken();
  let posts: Awaited<ReturnType<typeof fetchFeedServer>> = [];
  let error: string | null = null;
  let currentUserId: string | null = null;

  if (token) {
    try {
      const me = await fetchMe(token);
      currentUserId = me.id;
      posts = await fetchFeedServer(token);
    } catch {
      error = "Could not load feed. Is the backend running?";
    }
  } else {
    error = "Not signed in. Try signing out and back in.";
  }

  return (
    <>
      <header className="mb-6 text-center md:text-left">
        <h1 className="text-xl font-bold tracking-tight">Community</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Like and comment — updates appear live for everyone viewing the feed.
        </p>
      </header>
      <CommunityFeedClient
        initialPosts={posts}
        currentUserId={currentUserId}
        error={error}
      />
    </>
  );
}
