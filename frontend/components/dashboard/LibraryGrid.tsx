"use client";

import { useState } from "react";
import type { Post } from "@/lib/api";
import { deletePost } from "@/lib/api";

export default function LibraryGrid({
  initialPosts,
}: {
  initialPosts: Post[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deletePost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Failed to delete post");
    } finally {
      setDeleting(null);
    }
  }

  if (!posts.length) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500">
        Your library is empty. Generate a meme and save it to get started.
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {posts.map((post) => (
        <li
          key={post.id}
          className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.content_url}
            alt={post.caption ?? "Saved post"}
            className="aspect-video w-full object-cover"
          />
          <section className="flex items-center justify-between gap-2 p-3">
            <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {post.caption || "Untitled meme"}
            </p>
            <button
              type="button"
              disabled={deleting === post.id}
              onClick={() => handleDelete(post.id)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {deleting === post.id ? "…" : "Delete"}
            </button>
          </section>
        </li>
      ))}
    </ul>
  );
}
