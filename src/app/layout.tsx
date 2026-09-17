import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Prospecting OS",
  description: "DM Flows' BDR prospecting and sales engagement platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plexMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
