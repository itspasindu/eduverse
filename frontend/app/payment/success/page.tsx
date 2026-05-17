"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetchPaymentStatus } from "@/lib/api";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order_id");
  const [status, setStatus] = useState<"loading" | "active" | "pending" | "error">("loading");

  useEffect(() => {
    if (!orderId) {
      setStatus("pending");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetchPaymentStatus(orderId);
        if (cancelled) return;
        if (res.subscription_active) {
          setStatus("active");
          return;
        }
        if (res.status === "paid") {
          setStatus("active");
          return;
        }
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (!cancelled) setStatus("pending");
    };
    poll();
    const t = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [orderId]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Payment received</h1>
      {status === "loading" && (
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Confirming your subscription…</p>
      )}
      {status === "active" && (
        <>
          <p className="mt-4 text-emerald-700 dark:text-emerald-300">
            Your plan is active. Welcome to EduVerse!
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Go to dashboard
          </Link>
        </>
      )}
      {status === "pending" && (
        <>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Payment is processing. This can take a minute. You can open the dashboard — we will
            activate your plan automatically.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold"
          >
            Go to dashboard
          </Link>
        </>
      )}
      {status === "error" && (
        <p className="mt-4 text-amber-700 dark:text-amber-300">
          We could not confirm payment yet. Check Settings for your plan status or contact support.
        </p>
      )}
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<p className="p-16 text-center">Loading…</p>}>
      <SuccessContent />
    </Suspense>
  );
}
