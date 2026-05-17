"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PayHereCheckout from "@/components/subscriptions/PayHereCheckout";
import PricingCards from "@/components/subscriptions/PricingCards";
import type { CheckoutResponse, SubscriptionPlan, UserSubscription } from "@/lib/api";
import { createSubscriptionCheckout, selectSubscriptionPlan } from "@/lib/api";

export default function ChoosePlanClient({
  plans,
  current,
}: {
  plans: SubscriptionPlan[];
  current: UserSubscription | null;
}) {
  const router = useRouter();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);

  async function handleSelect(slug: string) {
    const plan = plans.find((p) => p.slug === slug);
    if (!plan) return;

    setBusySlug(slug);
    setError(null);
    setMessage(null);
    setCheckout(null);

    try {
      if (plan.price_cents <= 0) {
        const sub = await selectSubscriptionPlan(slug);
        if (sub.status === "active") {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      } else {
        const session = await createSubscriptionCheckout(slug);
        setCheckout(session);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusySlug(null);
    }
  }

  if (checkout) {
    return (
      <PayHereCheckout
        checkoutUrl={checkout.checkout_url}
        fields={checkout.fields}
        onError={() => setError("Could not open PayHere checkout. Try again.")}
      />
    );
  }

  return (
    <>
      {current?.status === "active" && (
        <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          You are on <strong>{current.plan.name}</strong>. Pick a different plan below to change.
        </p>
      )}
      {current?.status === "pending" && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Your <strong>{current.plan.name}</strong> plan is pending — complete payment or wait for
          admin approval.
        </p>
      )}
      {error && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
          {message}
        </p>
      )}
      <p className="mb-4 text-center text-xs text-zinc-500">
        Paid plans use PayHere sandbox for secure test payments.
      </p>
      <PricingCards
        plans={plans}
        onSelectPlan={handleSelect}
        selectedSlug={current?.plan.slug ?? null}
        busySlug={busySlug}
      />
    </>
  );
}
