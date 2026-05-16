import SettingsForm from "@/components/dashboard/SettingsForm";
import { fetchMe } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings — EduVerse" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    "";
  let avatarUrl =
    (user?.user_metadata?.avatar_url as string) ||
    (user?.user_metadata?.picture as string) ||
    null;
  let role = (user?.user_metadata?.role as string) ?? "student";

  const token = await getServerAccessToken();
  if (token) {
    try {
      const profile = await fetchMe(token);
      fullName = profile.full_name ?? fullName;
      avatarUrl = profile.avatar_url ?? avatarUrl;
      role = profile.role ?? role;
    } catch {
      // Use auth metadata
    }
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update your display name and profile photo.
        </p>
      </header>
      <SettingsForm
        email={user?.email ?? ""}
        fullName={fullName}
        role={role}
        avatarUrl={avatarUrl}
      />
    </>
  );
}
