"use client";

import { useState } from "react";
import type { PresentationResponse } from "@/lib/api";
import {
  downloadAllSlideImages,
  downloadPresentationHtml,
  downloadPresentationJson,
  downloadSlideImage,
} from "@/lib/presentation-download";

type Props = {
  deck: PresentationResponse;
  activeSlideIndex: number;
  onPrint: () => void;
};

export default function PresentationDownloadBar({
  deck,
  activeSlideIndex,
  onPrint,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeSlide = deck.slides[activeSlideIndex];
  const hasAnyImage = deck.slides.some((s) => s.image_url);

  async function run(
    key: string,
    fn: () => Promise<void> | void,
    success?: string,
  ) {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      if (success) setMessage(success);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => run("json", () => downloadPresentationJson(deck))}
          className={btn}
        >
          {busy === "json" ? "…" : "Download JSON"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() =>
            run("html", () => downloadPresentationHtml(deck), "HTML saved.")
          }
          className={btn}
        >
          {busy === "html" ? "…" : "Download HTML"}
        </button>
        <button
          type="button"
          onClick={onPrint}
          disabled={!!busy}
          className={btn}
        >
          Print / PDF
        </button>
        {activeSlide?.image_url && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run("one", () =>
                downloadSlideImage(
                  activeSlide.image_url!,
                  deck.title,
                  activeSlideIndex,
                ),
              )
            }
            className={btn}
          >
            {busy === "one" ? "…" : "This slide image"}
          </button>
        )}
        {hasAnyImage && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() =>
              run("all", async () => {
                const { downloaded, skipped } =
                  await downloadAllSlideImages(deck);
                setMessage(
                  `Downloaded ${downloaded} image${downloaded === 1 ? "" : "s"}` +
                    (skipped ? ` (${skipped} skipped).` : "."),
                );
              })
            }
            className={btn}
          >
            {busy === "all" ? "…" : "All slide images"}
          </button>
        )}
      </div>
      {message && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      )}
    </div>
  );
}
