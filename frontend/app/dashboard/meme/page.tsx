import MemeGenerator from "@/components/MemeGenerator";

export const metadata = { title: "Meme Studio — EduVerse" };

export default function MemeStudioPage() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Meme Studio</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Turn topics into shareable study memes and save them to your library.
        </p>
      </header>
      <MemeGenerator saveToLibrary />
    </>
  );
}
