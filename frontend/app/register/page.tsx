import RegisterForm from "@/components/auth/RegisterForm";
import SupabaseConfigBanner from "@/components/auth/SupabaseConfigBanner";

export const metadata = {
  title: "Create account — EduVerse",
};

export default function RegisterPage() {
  return (
    <>
      <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
        <section className="w-full max-w-md">
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight">Join EduVerse</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Start learning with AI memes and your personal tutor
            </p>
          </header>
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <SupabaseConfigBanner />
            <RegisterForm />
          </section>
        </section>
      </section>
    </>
  );
}
