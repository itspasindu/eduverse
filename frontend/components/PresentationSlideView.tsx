"use client";

import Image from "next/image";
import type { PresentationSlide } from "@/lib/api";
import type { FontStylePreset } from "@/lib/presentation-fonts";

type Props = {
  slide: PresentationSlide;
  slideIndex: number;
  totalSlides: number;
  preset: FontStylePreset;
  className?: string;
};

export default function PresentationSlideView({
  slide,
  slideIndex,
  totalSlides,
  preset,
  className = "",
}: Props) {
  return (
    <article
      className={`slide-deck-print overflow-hidden rounded-2xl border-2 shadow-xl ${preset.accent} ${className}`}
    >
      <div className="grid min-h-[280px] md:min-h-[320px] md:grid-cols-2">
        {slide.image_url ? (
          <div className="relative aspect-video md:aspect-auto md:min-h-full">
            <Image
              src={slide.image_url}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10" />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-zinc-200/80 text-sm text-zinc-500 md:aspect-auto">
            No image
          </div>
        )}

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Slide {slideIndex + 1} of {totalSlides}
          </p>
          <h4
            className={`mt-2 text-xl sm:text-2xl ${preset.headingClass} text-zinc-900 dark:text-zinc-50`}
          >
            {slide.title}
          </h4>
          <ul
            className={`mt-4 space-y-2 text-sm sm:text-base ${preset.bodyClass} text-zinc-800 dark:text-zinc-200`}
          >
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {slide.speaker_notes && (
        <p
          className={`border-t border-zinc-300/50 px-6 py-3 text-xs italic ${preset.bodyClass} text-zinc-600 dark:border-zinc-700 dark:text-zinc-400`}
        >
          Speaker notes: {slide.speaker_notes}
        </p>
      )}
    </article>
  );
}
