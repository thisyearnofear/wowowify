import type { Metadata } from "next";
import { APP_URL } from "@/lib/env";
import { MINIAPP_CONFIG } from "@/lib/miniapp";
import { BRAND } from "@/lib/brand";

const appUrl = APP_URL;
const product = BRAND.product;

// Mini App Embed configuration (Farcaster relaunch deferred)
const miniAppEmbed = {
  version: "1",
  imageUrl: `${appUrl}/previews/frame-preview.png`,
  button: {
    title: product,
    action: {
      type: "launch_frame",
      name: product,
      url: `${appUrl}/frames`,
      splashImageUrl: `${appUrl}/wowwowowify.png`,
      splashBackgroundColor: "#131313",
    },
  },
};

const frameConfig = {
  version: "next",
  imageUrl: `${appUrl}/previews/frame-preview.png`,
  button: {
    title: product,
    action: {
      type: "launch_frame",
      name: product,
      url: `${appUrl}/frames`,
      splashImageUrl: `${appUrl}/wowwowowify.png`,
      splashBackgroundColor: "#131313",
    },
  },
};

export const metadata: Metadata = {
  title: `${product} on ${BRAND.portfolio}`,
  description: MINIAPP_CONFIG.description,
  openGraph: {
    title: `${product} on ${BRAND.portfolio}`,
    description: MINIAPP_CONFIG.description,
    images: [
      {
        url: `${appUrl}/previews/frame-preview.png`,
        width: 1200,
        height: 630,
        alt: `${product} Mini App Preview`,
      },
    ],
    siteName: product,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${product} on ${BRAND.portfolio}`,
    description: MINIAPP_CONFIG.description,
    images: [`${appUrl}/previews/frame-preview.png`],
  },
  other: {
    "fc:miniapp": JSON.stringify(miniAppEmbed),
    "fc:frame": JSON.stringify(frameConfig),
    "fc:miniapp:name": product,
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
