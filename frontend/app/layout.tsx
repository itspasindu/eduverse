import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppHeader from "@/components/layout/AppHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduVerse AI — Social Learning Platform",
  description:
    "AI-powered memes, tutoring, and community learning for students and creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/798fffa1-a47e-44a4-9eec-58aba336e417", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0e14a3" },
    body: JSON.stringify({
      sessionId: "0e14a3",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "frontend/app/layout.tsx:RootLayout",
      message: "RootLayout render (server)",
      data: {
        netlify: Boolean(process.env.NETLIFY),
        context: process.env.CONTEXT ?? null,
        url: process.env.URL ?? null,
        deployUrl: process.env.DEPLOY_URL ?? null,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
        publicApiUrl: process.env.NEXT_PUBLIC_API_URL ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
