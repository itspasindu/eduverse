import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Payment cancelled</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        No charge was made. You can choose a plan again when you are ready.
      </p>
      <Link
        href="/choose-plan"
        className="mt-8 inline-block rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white"
      >
        Back to plans
      </Link>
    </main>
  );
}
