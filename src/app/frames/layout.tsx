import type { Metadata } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wowowify.vercel.app";

// Mini App Embed configuration
const miniAppEmbed = {
  version: "1",
  imageUrl: `${appUrl}/previews/frame-preview.png`,
  button: {
    title: "🎨 WOWOWIFY",
    action: {
      type: "launch_frame",
      name: "WOWOWIFY",
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
    title: "wowowify",
    action: {
      type: "launch_frame",
      name: "WOWOWIFY",
      url: `${appUrl}/frames`,
      splashImageUrl: `${appUrl}/wowwowowify.png`,
      splashBackgroundColor: "#131313",
    },
  },
};

export const metadata: Metadata = {
  title: "WOWOWIFY",
  description:
    "Create amazing visual overlays and effects directly in Farcaster. Transform your images with cool wowowify effects in seconds.",
  openGraph: {
    title: "WOWOWIFY",
    description:
      "Create amazing visual overlays and effects directly in Farcaster",
    images: [
      {
        url: `${appUrl}/previews/frame-preview.png`,
        width: 1200,
        height: 630,
        alt: "WOWOWIFY Frame Preview",
      },
    ],
    siteName: "WOWOWIFY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WOWOWIFY",
    description:
      "Create amazing visual overlays and effects directly in Farcaster",
    images: [`${appUrl}/previews/frame-preview.png`],
  },
  other: {
    // Primary Mini App embed tag
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    // Legacy frame tag for backward compatibility
    "fc:frame": JSON.stringify(frameConfig),
    // Additional Mini App metadata
    "fc:miniapp:name": "WOWOWIFY",
    "fc:miniapp:description":
      "Create amazing visual overlays and effects directly in Farcaster",
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
