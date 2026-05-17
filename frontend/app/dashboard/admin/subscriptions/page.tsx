import AdminSubscriptionsTable from "@/components/dashboard/AdminSubscriptionsTable";
import type { AdminSubscriptionRow, SubscriptionPlan } from "@/lib/api";
import {
  fetchAdminSubscriptions,
  fetchSubscriptionPlansServer,
} from "@/lib/api-server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function AdminSubscriptionsPage() {
  const token = await getServerAccessToken();
  let rows: AdminSubscriptionRow[] = [];
  let plans: SubscriptionPlan[] = [];
  let error: string | null = null;

  if (token) {
    try {
      [rows, plans] = await Promise.all([
        fetchAdminSubscriptions(token),
        fetchSubscriptionPlansServer(),
      ]);
    } catch {
      error = "Failed to load subscriptions. Run migration 009_subscriptions.sql in Supabase.";
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manually assign plans and activate paid accounts. Set status to{" "}
          <strong>active</strong> when payment is confirmed.
        </p>
      </header>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <AdminSubscriptionsTable initialRows={rows} plans={plans} />
      )}
    </>
  );
}
