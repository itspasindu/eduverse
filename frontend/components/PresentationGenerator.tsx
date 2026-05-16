"use client";

import { useCallback, useState } from "react";
import {
  FONT_STYLE_PRESETS,
  getFontPreset,
  type FontStyleId,
} from "@/lib/presentation-fonts";
import PresentationDownloadBar from "@/components/PresentationDownloadBar";
import PresentationSlideView from "@/components/PresentationSlideView";
import { generatePresentation, type PresentationResponse } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function PresentationGenerator() {
  const [notes, setNotes] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [fontStyle, setFontStyle] = useState<FontStyleId>("modern-sans");
  const [status, setStatus] = useState<Status>("idle");
  const [deck, setDeck] = useState<PresentationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeImages, setIncludeImages] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  const preset = getFontPreset(fontStyle);

  const handleGenerate = useCallback(async () => {
    const trimmed = notes.trim();
    if (!trimmed) {
      setError("Paste your study notes first.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);
    setDeck(null);

    try {
      const result = await generatePresentation(trimmed, {
        title: deckTitle.trim() || undefined,
        fontStyle,
        includeImages,
      });
      setDeck(result);
      setActiveSlide(0);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("error");
    }
  }, [notes, deckTitle, fontStyle, includeImages]);

  const handlePrint = () => window.print();

  const isLoading = status === "loading";
  const slide = deck?.slides[activeSlide];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-indigo-200/50 bg-white/80 p-6 shadow-lg shadow-indigo-500/5 dark:border-indigo-900/40 dark:bg-zinc-900/80">
        <header className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Slide Studio</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Turn notes into a presentation with AI visuals per slide. Download
            JSON, HTML, or images when your deck is ready.
          </p>
        </header>

        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Deck title (optional)
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Introduction to Photosynthesis"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            rows={8}
            placeholder="Paste lecture notes, bullet points, or an outline…"
            className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Font & typography style
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FONT_STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isLoading}
                onClick={() => setFontStyle(p.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  fontStyle === p.id
                    ? "border-indigo-500 ring-2 ring-indigo-500/30"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"
                } ${p.accent}`}
              >
                <p
                  className={`text-base ${p.headingClass} text-zinc-900 dark:text-zinc-100`}
                >
                  {p.sampleHeading}
                </p>
                <p
                  className={`mt-1 text-xs ${p.bodyClass} text-zinc-600 dark:text-zinc-400`}
                >
                  {p.sampleBody}
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {p.name}
                </p>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={includeImages}
            onChange={(e) => setIncludeImages(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          Include AI-generated images on each slide (uses fal.ai; may take longer)
        </label>

        {error && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50"
        >
          {isLoading
            ? includeImages
              ? "Building slides & images…"
              : "Building slides…"
            : "Generate presentation"}
        </button>
      </section>

      {deck && slide && (
        <section className="no-print space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className={`text-lg font-semibold ${preset.headingClass}`}>
                {deck.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {deck.slides.length} slides · {preset.name} · source:{" "}
                {deck.source}
              </p>
            </div>
            <PresentationDownloadBar
              deck={deck}
              activeSlideIndex={activeSlide}
              onPrint={handlePrint}
            />
          </div>

          <PresentationSlideView
            slide={slide}
            slideIndex={activeSlide}
            totalSlides={deck.slides.length}
            preset={preset}
          />

          <div className="flex flex-wrap gap-2">
            {deck.slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  i === activeSlide
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <div className="hidden print:block space-y-8">
            {deck.slides.map((s, i) => (
              <PresentationSlideView
                key={i}
                slide={s}
                slideIndex={i}
                totalSlides={deck.slides.length}
                preset={preset}
                className="mb-8"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
