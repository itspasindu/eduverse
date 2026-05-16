import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <section className="relative overflow-hidden">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <p className="mb-4 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
            AI-powered social learning
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 md:text-6xl dark:text-zinc-50">
            Learn faster with memes, tutors, and a creator community
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            EduVerse combines fal.ai image generation, an AI tutor, and a social feed
            so students and creators can study, publish, and grow together.
          </p>
          <section className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={user ? "/dashboard" : "/register"}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30"
            >
              {user ? "Open community" : "Start free"}
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              Sign in
            </Link>
          </section>
        </section>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50/50 py-16 dark:border-zinc-800 dark:bg-zinc-900/30">
        <section className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          <FeatureCard
            title="AI Meme Studio"
            description="Turn study notes into shareable memes with one prompt."
            href="/dashboard/meme"
          />
          <FeatureCard
            title="AI Tutor"
            description="Ask questions in standard, simple, or meme explanation modes."
            href="/dashboard/tutor"
          />
          <FeatureCard
            title="Community Feed"
            description="Publish content, browse posts, and track your library."
            href="/dashboard"
          />
        </section>
      </section>
    </>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </Link>
  );
}
