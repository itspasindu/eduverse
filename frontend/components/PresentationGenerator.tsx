"use client";

import { useCallback, useState } from "react";
import {
  FONT_STYLE_PRESETS,
  getFontPreset,
  type FontStyleId,
} from "@/lib/presentation-fonts";
import { generatePresentation, type PresentationResponse } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function PresentationGenerator() {
  const [notes, setNotes] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [fontStyle, setFontStyle] = useState<FontStyleId>("modern-sans");
  const [status, setStatus] = useState<Status>("idle");
  const [deck, setDeck] = useState<PresentationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      });
      setDeck(result);
      setActiveSlide(0);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("error");
    }
  }, [notes, deckTitle, fontStyle]);

  const handlePrint = () => window.print();

  const isLoading = status === "loading";
  const slide = deck?.slides[activeSlide];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-indigo-200/50 bg-white/80 p-6 shadow-lg shadow-indigo-500/5 dark:border-indigo-900/40 dark:bg-zinc-900/80">
        <header className="mb-5">
          <h2 className="text-xl font-semibold tracking-tight">Slide Studio</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Turn notes into a presentation. Pick a font style — typography is
            applied to every slide in the deck.
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
          {isLoading ? "Building slides…" : "Generate presentation"}
        </button>
      </section>

      {deck && slide && (
        <section className="no-print space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-semibold ${preset.headingClass}`}>
                {deck.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {deck.slides.length} slides · {preset.name} · source: {deck.source}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Print / PDF
            </button>
          </div>

          <div
            className={`slide-deck-print aspect-[16/10] overflow-hidden rounded-2xl border-2 p-8 shadow-xl ${preset.accent}`}
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Slide {activeSlide + 1} of {deck.slides.length}
            </p>
            <h4
              className={`mt-3 text-2xl sm:text-3xl ${preset.headingClass} text-zinc-900 dark:text-zinc-50`}
            >
              {slide.title}
            </h4>
            <ul
              className={`mt-6 space-y-3 text-base sm:text-lg ${preset.bodyClass} text-zinc-800 dark:text-zinc-200`}
            >
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {slide.speaker_notes && (
              <p
                className={`mt-8 border-t border-zinc-300/50 pt-4 text-sm italic ${preset.bodyClass} text-zinc-600 dark:text-zinc-400`}
              >
                Speaker notes: {slide.speaker_notes}
              </p>
            )}
          </div>

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

          <div className="hidden print:block">
            {deck.slides.map((s, i) => (
              <div
                key={i}
                className={`slide-deck-print mb-8 aspect-[16/10] border p-8 ${preset.accent}`}
              >
                <h4 className={`text-2xl ${preset.headingClass}`}>{s.title}</h4>
                <ul className={`mt-4 list-disc pl-6 ${preset.bodyClass}`}>
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
