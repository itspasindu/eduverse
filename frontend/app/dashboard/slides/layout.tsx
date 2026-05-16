import { presentationFontVariables } from "@/lib/presentation-fonts-next";

export default function SlidesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={presentationFontVariables}>{children}</div>;
}
