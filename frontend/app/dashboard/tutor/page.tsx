import TutorChat from "@/components/TutorChat";

export const metadata = { title: "AI Tutor — EduVerse" };

export default function TutorPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Tutor</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ask questions and pick how you want concepts explained.
        </p>
      </header>
      <TutorChat />
    </>
  );
}
