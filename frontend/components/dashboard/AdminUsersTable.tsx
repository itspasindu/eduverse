"use client";

import { useState } from "react";
import type { AdminUserRow } from "@/lib/api";
import { updateUserRole } from "@/lib/api";

const ROLES = ["student", "creator", "teacher", "admin"] as const;

export default function AdminUsersTable({
  initialUsers,
}: {
  initialUsers: AdminUserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onRoleChange(userId: string, role: string) {
    setBusyId(userId);
    setMessage(null);
    try {
      const updated = await updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)),
      );
      setMessage("Role updated. User should sign out and back in to refresh JWT.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {message && (
        <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-3 font-medium">
                  {user.full_name || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={busyId === user.id}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <p className="p-8 text-center text-sm text-zinc-500">No users found.</p>
        )}
      </div>
    </div>
  );
}
