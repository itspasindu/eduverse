"use client";

import { useCallback, useState } from "react";
import MemeCard from "@/components/MemeCard";
import { generateMeme, savePost } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

type MemeData = {
  imageUrl: string;
  topText: string;
  bottomText: string;
};

type Props = {
  saveToLibrary?: boolean;
};

export default function MemeGenerator({ saveToLibrary = false }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [meme, setMeme] = useState<MemeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Enter a topic or notes first.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);
    setMeme(null);
    setSaved(false);

    try {
      const result = await generateMeme(trimmed);
      setMeme({
        imageUrl: result.image_url,
        topText: result.top_text || "",
        bottomText: result.bottom_text || "",
      });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [text]);

  const isLoading = status === "loading";
  const captionForSave = meme
    ? [meme.topText, meme.bottomText].filter(Boolean).join(" / ")
    : text.trim();

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-violet-500/20 bg-white/80 p-6 shadow-xl shadow-violet-500/10 backdrop-blur dark:bg-zinc-900/80">
      <header className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          AI Meme Generator
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          We generate the scene with AI and add clear English captions on top — no
          gibberish text in the image.
        </p>
      </header>

      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Topic or notes
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
          rows={4}
          placeholder="e.g. programmer debugging HTML code"
          className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading || !text.trim()}
        className="meme-btn mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Spinner />
            Generating meme…
          </>
        ) : (
          "Generate Meme"
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {isLoading && <LoadingPanel />}

      {status === "success" && meme && (
        <figure className="meme-result mt-6 space-y-3">
          <MemeCard
            imageUrl={meme.imageUrl}
            topText={meme.topText}
            bottomText={meme.bottomText}
          />
          {saveToLibrary && (
            <figcaption className="flex gap-2">
              <button
                type="button"
                disabled={saved || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await savePost(meme.imageUrl, captionForSave);
                    setSaved(true);
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Failed to save",
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saved ? "Saved to library ✓" : saving ? "Saving…" : "Save to library"}
              </button>
            </figcaption>
          )}
        </figure>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
      aria-hidden
    />
  );
}

function LoadingPanel() {
  return (
    <div
      className="meme-loading mt-6 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-indigo-50 p-8 dark:border-violet-900/40 dark:from-violet-950/40 dark:to-indigo-950/40"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex max-w-xs flex-col items-center gap-4 text-center">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-400/40" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-violet-500/60" />
          <span className="absolute inset-4 flex items-center justify-center rounded-full bg-violet-600 text-lg text-white">
            ✨
          </span>
        </div>
        <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
          Writing captions & generating scene…
        </p>
        <div className="flex w-full gap-2">
          <span className="meme-shimmer h-2 flex-1 rounded-full" />
          <span className="meme-shimmer h-2 flex-[0.6] rounded-full [animation-delay:150ms]" />
          <span className="meme-shimmer h-2 flex-[0.4] rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
