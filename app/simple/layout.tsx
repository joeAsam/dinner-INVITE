import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { content } from "./content";
import "./pxxl.css";

const geist = Geist({ subsets: ["latin"], weight: ["600"], variable: "--font-geist" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: content.site.title,
  description: content.site.description,
};

/** Simple View shell. Everything on this route lives under .pxxl, which carries its own tokens and fonts. */
export default function SimpleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pxxl ${geist.variable} ${mono.variable}`}>
      {/* Satoshi and Cabinet Grotesk come from Fontshare; one request per family. React hoists these into <head>. */}
      <link
        rel="stylesheet"
        precedence="default"
        href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
      />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700&display=swap"
      />
      {children}
    </div>
  );
}
