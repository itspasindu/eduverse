import type { Announcement } from "@/lib/api";
import { fetchAnnouncementsFeed } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function StudentAnnouncementsPage() {
  const token = await getServerAccessToken();
  let items: Announcement[] = [];
  let error: string | null = null;

  if (token) {
    try {
      items = await fetchAnnouncementsFeed(token);
    } catch {
      error =
        "Could not load announcements. Ask your teacher to publish updates, or run migration 005.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Class updates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Announcements from your teachers.
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold">{a.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
              {a.body}
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              {new Date(a.created_at).toLocaleString()}
            </p>
          </li>
        ))}
        {!items.length && !error && (
          <li className="rounded-xl border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No announcements yet. Check back after your teacher posts an update.
          </li>
        )}
      </ul>
    </>
  );
}
