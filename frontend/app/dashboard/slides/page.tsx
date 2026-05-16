import PresentationGenerator from "@/components/PresentationGenerator";

export const metadata = { title: "Slide Studio — EduVerse" };

export default function SlidesPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Slide Studio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Creator tool — generate presentation slides from your notes with
          professional font styles.
        </p>
      </header>
      <PresentationGenerator />
    </>
  );
}
