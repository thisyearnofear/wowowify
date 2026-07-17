import type { Metadata } from "next";
import { APP_URL } from "@/lib/env";
import { MINIAPP_CONFIG } from "@/lib/miniapp";

const appUrl = APP_URL;

// Mini App Embed configuration
const miniAppEmbed = {
  version: "1",
  imageUrl: `${appUrl}/previews/frame-preview.png`,
  button: {
    title: "@toka",
    action: {
      type: "launch_frame",
      name: "@toka",
      url: `${appUrl}/frames`,
      splashImageUrl: `${appUrl}/wowwowowify.png`,
      splashBackgroundColor: "#131313",
    },
  },
};

// Legacy frame configuration for backward compatibility
const frameConfig = {
  version: "next",
  imageUrl: `${appUrl}/previews/frame-preview.png`,
  button: {
    title: "@toka",
    action: {
      type: "launch_frame",
      name: "@toka",
      url: `${appUrl}/frames`,
      splashImageUrl: `${appUrl}/wowwowowify.png`,
      splashBackgroundColor: "#131313",
    },
  },
};

export const metadata: Metadata = {
  title: `${MINIAPP_CONFIG.name} — Agentic Brand Studio`,
  description: MINIAPP_CONFIG.description,
  openGraph: {
    title: `${MINIAPP_CONFIG.name} — Agentic Brand Studio`,
    description: MINIAPP_CONFIG.description,
    images: [
      {
        url: `${appUrl}/previews/frame-preview.png`,
        width: 1200,
        height: 630,
        alt: "@toka Mini App Preview",
      },
    ],
    siteName: "@toka",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${MINIAPP_CONFIG.name} — Agentic Brand Studio`,
    description: MINIAPP_CONFIG.description,
    images: [`${appUrl}/previews/frame-preview.png`],
  },
  other: {
    // Primary Mini App embed tag
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    // Legacy frame tag for backward compatibility
    "fc:frame": JSON.stringify(frameConfig),
    // Additional Mini App metadata
    "fc:miniapp:name": "@toka",
    "fc:miniapp:description": MINIAPP_CONFIG.description,
    "fc:miniapp:icon": `${appUrl}/wowwowowify.png`,
    "fc:miniapp:splash": `${appUrl}/wowwowowify.png`,
    "fc:miniapp:splash-background": "#131313",
  },
};

export default function FrameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-gray-900 min-h-screen">{children}</div>;
}
