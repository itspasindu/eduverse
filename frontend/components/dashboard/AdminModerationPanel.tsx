"use client";

import { useState } from "react";
import type { AdminPostRow } from "@/lib/api";
import { adminDeletePost } from "@/lib/api";

export default function AdminModerationPanel({
  initialPosts,
}: {
  initialPosts: AdminPostRow[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(postId: string) {
    if (!confirm("Remove this post from the platform?")) return;
    setBusyId(postId);
    try {
      await adminDeletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch {
      alert("Failed to delete post");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
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
          <div className="space-y-2 p-3">
            {post.caption && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {post.caption}
              </p>
            )}
            <p className="text-xs text-zinc-400">
              {post.author_email ?? "Unknown"} · {post.type} · ❤️ {post.likes}
            </p>
            <button
              type="button"
              disabled={busyId === post.id}
              onClick={() => remove(post.id)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              {busyId === post.id ? "Removing…" : "Remove post"}
            </button>
          </div>
        </li>
      ))}
      {!posts.length && (
        <li className="col-span-full rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500">
          No posts to moderate.
        </li>
      )}
    </ul>
  );
}
