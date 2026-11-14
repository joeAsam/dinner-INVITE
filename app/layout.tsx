import type { Metadata, Viewport } from "next";
import { Archivo, Geist, JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
// The home page's 3D experience shares the simple view's typefaces: Geist for big headlines and
// JetBrains Mono for labels (here), Satoshi and Cabinet Grotesk from Fontshare (loaded by app/page.tsx).
const atlas = Geist({ subsets: ["latin"], weight: ["600"], variable: "--font-atlas-display", display: "swap" });
const atlasMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-atlas-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Youth Choir Week 2026 · Eket, Akwa Ibom State",
  description: "You’re invited: five days, four venues across Eket and Ikot Abasi. Leadership Session, Movie Night, Excursion, Games Night, and Dinner & Awards.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#080b20", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable} ${atlas.variable} ${atlasMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
