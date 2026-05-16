"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Announcement } from "@/lib/api";
import { createAnnouncement, deleteAnnouncement } from "@/lib/api";

export default function TeacherAnnouncementsPanel({
  initialAnnouncements,
}: {
  initialAnnouncements: Announcement[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialAnnouncements);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createAnnouncement(title, body);
      setItems((prev) => [created, ...prev]);
      setTitle("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Could not delete");
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-5 dark:border-violet-900/50 dark:bg-violet-950/20"
      >
        <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
          New class announcement
        </h2>
        <label className="mt-4 block text-sm">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Quiz on Friday"
          />
        </label>
        <label className="mt-3 block text-sm">
          Message
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Review chapters 4–6 before class…"
          />
        </label>
        {error && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Publishing…" : "Publish to class"}
        </button>
      </form>

      <ul className="space-y-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                  {a.body}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(a.id)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {!items.length && (
          <li className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            No announcements yet. Publish one for your students.
          </li>
        )}
      </ul>
    </div>
  );
}
