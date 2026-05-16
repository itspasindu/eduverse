import type { TeacherStudent } from "@/lib/api";
import { fetchTeacherStudents } from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function TeacherStudentsPage() {
  const token = await getServerAccessToken();
  let students: TeacherStudent[] = [];
  let error: string | null = null;

  if (token) {
    try {
      students = await fetchTeacherStudents(token);
    } catch {
      error = "Failed to load student roster.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Student roster</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All registered students on the platform ({students.length}).
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="px-4 py-3 font-medium">
                    {s.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {s.email}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && (
            <p className="p-8 text-center text-sm text-zinc-500">
              No students registered yet.
            </p>
          )}
        </div>
      )}
    </>
  );
}
