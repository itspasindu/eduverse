"use client";

import { useCallback, useState } from "react";
import FeedPostCard from "@/components/community/FeedPostCard";
import { useFeedWebSocket } from "@/hooks/useFeedWebSocket";
import type { Post, PostComment } from "@/lib/api";
import type { FeedWsMessage } from "@/lib/feed-realtime";

type Props = {
  initialPosts: Post[];
  currentUserId: string | null;
  error?: string | null;
};

export default function CommunityFeedClient({
  initialPosts,
  currentUserId,
  error: initialError,
}: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [error] = useState(initialError ?? null);
  const [wsConnected, setWsConnected] = useState(false);
  /** Latest remote comment per post (not an accumulating list). */
  const [latestRemoteComment, setLatestRemoteComment] = useState<
    Record<string, PostComment | undefined>
  >({});

  const handleWsMessage = useCallback(
    (msg: FeedWsMessage) => {
      if (msg.type === "like_update") {
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== msg.post_id) return p;
            const isMe = currentUserId === msg.user_id;
            return {
              ...p,
              likes: msg.likes,
              liked_by_me: isMe ? msg.liked : p.liked_by_me,
            };
          }),
        );
        return;
      }

      if (msg.type === "comment_added") {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === msg.post_id ? { ...p, comments: msg.comments } : p,
          ),
        );
        // Author already merged locally; skip echo for own comments
        if (currentUserId && msg.comment.user_id === currentUserId) {
          return;
        }
        setLatestRemoteComment((prev) => ({
          ...prev,
          [msg.post_id]: msg.comment,
        }));
      }
    },
    [currentUserId],
  );

  useFeedWebSocket(handleWsMessage, () => setWsConnected(true));

  const updatePost = useCallback((postId: string, patch: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
    );
  }, []);

  const clearRemoteComment = useCallback((postId: string) => {
    setLatestRemoteComment((prev) => {
      if (!prev[postId]) return prev;
      const next = { ...prev };
      delete next[postId];
      return next;
    });
  }, []);

  return (
    <div className="w-full">
      <p className="mb-4 text-xs text-zinc-500">
        {wsConnected ? "Live updates on" : "Connecting for live updates…"}
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </p>
      )}

      {posts.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No posts yet. Be the first to publish from Meme Studio!
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.id}>
              <FeedPostCard
                post={post}
                currentUserId={currentUserId}
                onPostUpdate={updatePost}
                remoteComment={latestRemoteComment[post.id]}
                onConsumeRemoteComment={clearRemoteComment}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
