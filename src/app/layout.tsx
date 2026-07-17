import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createMiniAppMetaTags, MINIAPP_CONFIG } from "@/lib/miniapp";
import { APP_URL, APP_ICON_URL } from "@/lib/env";
import ClientRoot from "@/components/providers/ClientRoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...createMiniAppMetaTags(
    `${MINIAPP_CONFIG.name} — Agentic Brand Studio`,
    MINIAPP_CONFIG.description,
    `${APP_URL}/previews/frame-preview.png`,
    "🎨 Generate Image",
  ),
  metadataBase: new URL(APP_URL),
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  manifest: `${APP_URL}/.well-known/farcaster.json`,
  icons: { icon: APP_ICON_URL },
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
        {/* Prevent dark mode FOUC by setting class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ClientRoot mounts shared client-only UI such as toast notifications. */}
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
