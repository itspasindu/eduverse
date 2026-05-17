import Link from "next/link";
import PricingCards from "@/components/subscriptions/PricingCards";
import type { SubscriptionPlan } from "@/lib/api";
import { fetchSubscriptionPlansServer } from "@/lib/api-server";

export default async function PricingPage() {
  let plans: SubscriptionPlan[] = [];
  let error: string | null = null;
  try {
    plans = await fetchSubscriptionPlansServer();
  } catch {
    error = "Could not load plans. Is the backend running?";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-12 text-center">
        <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
          Simple pricing
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Choose your EduVerse plan</h1>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Start free, upgrade when you need AI studios and lesson tools. Paid plans are activated
          manually by our team after you sign up.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          {error}
        </p>
      ) : (
        <PricingCards plans={plans} ctaHref="/register" ctaLabel="Create account" />
      )}

      <p className="mt-12 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
