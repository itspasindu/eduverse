import {
  Cormorant_Garamond,
  Inter,
  JetBrains_Mono,
  Montserrat,
  Nunito,
  Playfair_Display,
  Source_Serif_4,
} from "next/font/google";

export const pfInter = Inter({
  subsets: ["latin"],
  variable: "--pf-inter",
  display: "swap",
});

export const pfMontserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--pf-montserrat",
  display: "swap",
});

export const pfNunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--pf-nunito",
  display: "swap",
});

export const pfPlayfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--pf-playfair",
  display: "swap",
});

export const pfSourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--pf-source-serif",
  display: "swap",
});

export const pfJetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--pf-jetbrains",
  display: "swap",
});

export const pfCormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--pf-cormorant",
  display: "swap",
});

/** Class string for slides layout wrapper (loads all presentation font variables). */
export const presentationFontVariables = [
  pfInter.variable,
  pfMontserrat.variable,
  pfNunito.variable,
  pfPlayfair.variable,
  pfSourceSerif.variable,
  pfJetbrains.variable,
  pfCormorant.variable,
].join(" ");
