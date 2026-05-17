"use client";

import { useState } from "react";
import type { AdminSubscriptionRow, SubscriptionPlan } from "@/lib/api";
import { updateUserSubscription } from "@/lib/api";

const STATUSES = ["pending", "active", "cancelled", "expired"] as const;

export default function AdminSubscriptionsTable({
  initialRows,
  plans,
}: {
  initialRows: AdminSubscriptionRow[];
  plans: SubscriptionPlan[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(
    userId: string,
    planSlug: string,
    status: string,
    notes: string,
  ) {
    setBusyId(userId);
    setMessage(null);
    try {
      const updated = await updateUserSubscription(userId, {
        plan_slug: planSlug,
        status,
        notes: notes || null,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.user_id === userId
            ? {
                ...r,
                subscription: updated,
              }
            : r,
        ),
      );
      setMessage("Subscription updated.");
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
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SubscriptionRowEditor
                key={row.user_id}
                row={row}
                plans={plans}
                busy={busyId === row.user_id}
                onSave={save}
              />
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-zinc-500">No users found.</p>
        )}
      </div>
    </div>
  );
}

function SubscriptionRowEditor({
  row,
  plans,
  busy,
  onSave,
}: {
  row: AdminSubscriptionRow;
  plans: SubscriptionPlan[];
  busy: boolean;
  onSave: (userId: string, planSlug: string, status: string, notes: string) => void;
}) {
  const [planSlug, setPlanSlug] = useState(row.subscription?.plan.slug ?? "starter");
  const [status, setStatus] = useState(row.subscription?.status ?? "pending");
  const [notes, setNotes] = useState(row.subscription?.notes ?? "");

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <td className="px-4 py-3">
        <p className="font-medium">{row.full_name || "—"}</p>
        <p className="text-xs text-zinc-500">{row.email}</p>
        <p className="text-xs text-zinc-400">{row.role}</p>
      </td>
      <td className="px-4 py-3">
        <select
          value={planSlug}
          disabled={busy}
          onChange={(e) => setPlanSlug(e.target.value)}
          className="w-full min-w-[120px] rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {plans.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          value={status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={notes}
          disabled={busy}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Admin note"
          className="w-full min-w-[140px] rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSave(row.user_id, planSlug, status, notes)}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
