import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import "./globals.css";
import "./experience.css";
import "./experience-states.css";
import "./choir.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Youth Choir Week 2026 · Eket, Akwa Ibom State",
  description: "You’re invited: five days, four venues across Eket and Ikot Abasi. Leadership Session, Movie Night, Excursion, Games Night, and Dinner & Awards.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#04060d", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
