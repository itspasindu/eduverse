import Link from "next/link";
import { redirect } from "next/navigation";
import ChoosePlanClient from "@/components/subscriptions/ChoosePlanClient";
import type { SubscriptionPlan, UserSubscription } from "@/lib/api";
import {
  fetchMySubscriptionServer,
  fetchSubscriptionPlansServer,
} from "@/lib/api-server";
import { createClient } from "@/lib/supabase/server";
import { getServerAccessToken } from "@/lib/supabase/server-auth";

export default async function ChoosePlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register");
  }

  const token = await getServerAccessToken();
  let plans: SubscriptionPlan[] = [];
  let current: UserSubscription | null = null;
  try {
    plans = await fetchSubscriptionPlansServer();
    if (token) {
      current = await fetchMySubscriptionServer(token);
    }
  } catch {
    /* show empty state in client */
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pick your plan</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
          Welcome! Choose a plan to finish setting up your account. Free Starter activates
          immediately; paid plans need a quick admin approval.
        </p>
      </header>

      {plans.length ? (
        <ChoosePlanClient plans={plans} current={current} />
      ) : (
        <p className="text-center text-sm text-amber-700">
          Plans unavailable — run migration{" "}
          <code className="text-xs">009_subscriptions.sql</code> in Supabase and restart the
          backend.
        </p>
      )}

      <p className="mt-10 text-center text-sm text-zinc-500">
        <Link href="/pricing" className="text-violet-600 hover:underline">
          Compare plans in detail
        </Link>
      </p>
    </main>
  );
}
