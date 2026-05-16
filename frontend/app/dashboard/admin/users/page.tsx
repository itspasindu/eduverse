import AdminUsersTable from "@/components/dashboard/AdminUsersTable";
import type { AdminUserRow } from "@/lib/api";
import { fetchAdminUsers } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function AdminUsersPage() {
  const token = await getServerAccessToken();
  let users: AdminUserRow[] = [];
  let error: string | null = null;

  if (token) {
    try {
      users = await fetchAdminUsers(token);
    } catch {
      error = "Failed to load users.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">User management</h1>
        <p className="mt-1 text-sm text-zinc-500">
          View accounts and assign roles (student, creator, teacher, admin).
        </p>
      </header>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <AdminUsersTable initialUsers={users} />
      )}
    </>
  );
}
