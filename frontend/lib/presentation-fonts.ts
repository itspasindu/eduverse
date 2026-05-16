/** Typography presets for creator slide decks (Google Fonts loaded in globals.css). */

export type FontStyleId =
  | "academic-classic"
  | "modern-sans"
  | "bold-keynote"
  | "playful-edu"
  | "tech-mono"
  | "elegant-display";

export type FontStylePreset = {
  id: FontStyleId;
  name: string;
  description: string;
  headingClass: string;
  bodyClass: string;
  accent: string;
  sampleHeading: string;
  sampleBody: string;
};

export const FONT_STYLE_PRESETS: FontStylePreset[] = [
  {
    id: "academic-classic",
    name: "Academic Classic",
    description: "Serif headings · scholarly & formal",
    headingClass: "font-presentation-playfair",
    bodyClass: "font-presentation-source-serif",
    accent: "border-amber-600/40 bg-amber-50/80 dark:bg-amber-950/30",
    sampleHeading: "Chapter overview",
    sampleBody: "Clear thesis and evidence-based points.",
  },
  {
    id: "modern-sans",
    name: "Modern Sans",
    description: "Inter · clean corporate deck",
    headingClass: "font-presentation-inter",
    bodyClass: "font-presentation-inter",
    accent: "border-sky-600/40 bg-sky-50/80 dark:bg-sky-950/30",
    sampleHeading: "Project summary",
    sampleBody: "Minimal layout, high readability.",
  },
  {
    id: "bold-keynote",
    name: "Bold Keynote",
    description: "Montserrat · loud titles, punchy slides",
    headingClass: "font-presentation-montserrat font-extrabold tracking-tight",
    bodyClass: "font-presentation-montserrat font-medium",
    accent: "border-violet-600/40 bg-violet-50/80 dark:bg-violet-950/30",
    sampleHeading: "Big idea",
    sampleBody: "Short bullets. Strong contrast.",
  },
  {
    id: "playful-edu",
    name: "Playful Edu",
    description: "Nunito · friendly classroom vibe",
    headingClass: "font-presentation-nunito font-bold",
    bodyClass: "font-presentation-nunito",
    accent: "border-emerald-600/40 bg-emerald-50/80 dark:bg-emerald-950/30",
    sampleHeading: "Let's learn!",
    sampleBody: "Warm tone for younger learners.",
  },
  {
    id: "tech-mono",
    name: "Tech Mono",
    description: "JetBrains Mono + Inter · code & APIs",
    headingClass: "font-presentation-jetbrains font-semibold",
    bodyClass: "font-presentation-inter",
    accent: "border-zinc-500/40 bg-zinc-100/90 dark:bg-zinc-900/60",
    sampleHeading: "function deploy()",
    sampleBody: "Monospace titles, sans body text.",
  },
  {
    id: "elegant-display",
    name: "Elegant Display",
    description: "Cormorant Garamond · editorial polish",
    headingClass: "font-presentation-cormorant font-semibold italic",
    bodyClass: "font-presentation-source-serif",
    accent: "border-rose-600/30 bg-rose-50/70 dark:bg-rose-950/25",
    sampleHeading: "Insights",
    sampleBody: "Refined spacing and serif rhythm.",
  },
];

export function getFontPreset(id: string): FontStylePreset {
  return (
    FONT_STYLE_PRESETS.find((p) => p.id === id) ?? FONT_STYLE_PRESETS[1]
  );
}
