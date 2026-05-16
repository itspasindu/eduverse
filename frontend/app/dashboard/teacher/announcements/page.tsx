import TeacherAnnouncementsPanel from "@/components/dashboard/TeacherAnnouncementsPanel";
import type { Announcement } from "@/lib/api";
import { fetchTeacherAnnouncements } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function TeacherAnnouncementsPage() {
  const token = await getServerAccessToken();
  let announcements: Announcement[] = [];

  if (token) {
    try {
      announcements = await fetchTeacherAnnouncements(token);
    } catch {
      // Panel will show empty state
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Class announcements</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Publish updates visible to all students on their Class Updates page.
        </p>
      </header>
      <TeacherAnnouncementsPanel initialAnnouncements={announcements} />
    </>
  );
}
