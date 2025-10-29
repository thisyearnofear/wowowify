import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createMiniAppMetaTags } from "@/lib/miniapp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wowowify.vercel.app";

export const metadata: Metadata = {
  ...createMiniAppMetaTags(
    "WOWOWIFY",
    "Create amazing visual overlays and effects directly in Farcaster. Transform your images with cool wowowify effects in seconds.",
    `${appUrl}/previews/frame-preview.png`,
    "🎨 Generate Image",
  ),
  metadataBase: new URL(appUrl),
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  manifest: `${appUrl}/.well-known/farcaster.json`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#131313" />
        <link rel="icon" href="/wowwowowify.png" />
        <link rel="manifest" href="/.well-known/farcaster.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
