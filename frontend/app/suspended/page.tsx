import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white px-8 py-10 text-center shadow-sm dark:border-amber-900/50 dark:bg-zinc-900">
        <p className="text-4xl" aria-hidden>
          ⛔
        </p>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Account suspended
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your account was suspended after repeated use of inappropriate language
          in prompts or comments. Sign out below or contact an administrator if
          you believe this was a mistake.
        </p>
        <form action="/auth/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Sign out
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          <Link href="/" className="underline hover:text-zinc-700">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
