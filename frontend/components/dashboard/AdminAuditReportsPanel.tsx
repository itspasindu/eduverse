"use client";

import { useState } from "react";
import type { AuditEventRow, ContentReportRow } from "@/lib/api";
import { reviewReport } from "@/lib/api";

export default function AdminAuditReportsPanel({
  initialAudit,
  initialReports,
}: {
  initialAudit: AuditEventRow[];
  initialReports: ContentReportRow[];
}) {
  const [audit] = useState(initialAudit);
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setReportStatus(
    id: string,
    status: "reviewed" | "dismissed",
  ) {
    setBusyId(id);
    try {
      await reviewReport(id, status);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to update report");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pending reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending reports.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <p className="text-sm font-medium">
                  {r.target_type} · {r.target_id.slice(0, 8)}…
                </p>
                {r.reason && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {r.reason}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => setReportStatus(r.id, "reviewed")}
                    className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => setReportStatus(r.id, "dismissed")}
                    className="rounded-lg border border-zinc-200 px-3 py-1 text-xs dark:border-zinc-700"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Audit log</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-500">No audit events yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Target</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-medium">{e.action}</td>
                    <td className="px-3 py-2">{e.actor_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2">
                      {e.target_type ?? "—"} {e.target_id?.slice(0, 8) ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
