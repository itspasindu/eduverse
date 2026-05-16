import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import SupabaseConfigBanner from "@/components/auth/SupabaseConfigBanner";

export const metadata = {
  title: "Sign in — EduVerse",
};

export default function LoginPage() {
  return (
    <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to your EduVerse workspace
          </p>
        </header>
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <SupabaseConfigBanner />
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </section>
      </section>
    </section>
  );
}
