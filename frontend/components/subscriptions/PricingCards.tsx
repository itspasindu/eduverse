import Link from "next/link";
import type { SubscriptionPlan } from "@/lib/api";

function formatPrice(cents: number, period: string) {
  if (cents === 0) return "Free";
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${dollars}/${period === "year" ? "yr" : "mo"}`;
}

export default function PricingCards({
  plans,
  ctaHref,
  ctaLabel = "Get started",
  onSelectPlan,
  selectedSlug,
  busySlug,
}: {
  plans: SubscriptionPlan[];
  ctaHref?: string;
  ctaLabel?: string;
  onSelectPlan?: (slug: string) => void;
  selectedSlug?: string | null;
  busySlug?: string | null;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const highlighted = plan.slug === "pro";
        const isSelected = selectedSlug === plan.slug;
        return (
          <article
            key={plan.slug}
            className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition ${
              highlighted
                ? "border-violet-500 bg-gradient-to-b from-violet-50/80 to-white dark:from-violet-950/30 dark:to-zinc-950"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50"
            } ${isSelected ? "ring-2 ring-violet-500" : ""}`}
          >
            {highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-bold">{plan.name}</h3>
            {plan.tagline && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>
            )}
            <p className="mt-4 text-3xl font-bold tracking-tight">
              {formatPrice(plan.price_cents, plan.billing_period)}
            </p>
            {plan.description && (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{plan.description}</p>
            )}
            <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-violet-600">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <PlanCta
              plan={plan}
              ctaHref={ctaHref}
              ctaLabel={ctaLabel}
              onSelectPlan={onSelectPlan}
              isSelected={isSelected}
              busy={busySlug === plan.slug}
            />
          </article>
        );
      })}
    </div>
  );
}

function PlanCta({
  plan,
  ctaHref,
  ctaLabel,
  onSelectPlan,
  isSelected,
  busy,
}: {
  plan: SubscriptionPlan;
  ctaHref?: string;
  ctaLabel: string;
  onSelectPlan?: (slug: string) => void;
  isSelected: boolean;
  busy: boolean;
}) {
  const btnClass =
    "mt-8 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition " +
    (plan.slug === "pro"
      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
      : "border border-zinc-200 bg-white text-zinc-800 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50");

  if (onSelectPlan) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => onSelectPlan(plan.slug)}
        className={btnClass}
      >
        {busy ? "Saving…" : isSelected ? "Selected" : `Choose ${plan.name}`}
      </button>
    );
  }

  const href = ctaHref ?? "/register";
  return (
    <Link href={href} className={btnClass}>
      {plan.price_cents === 0 ? ctaLabel : "Get started"}
    </Link>
  );
}
