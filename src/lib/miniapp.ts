/**
 * Mini App utilities and configuration for Farcaster Mini Apps
 */

import FrameSDK from "@farcaster/frame-sdk";

// Type assertion to help TypeScript
const frameSDK = FrameSDK as typeof FrameSDK;

// Mini App configuration constants
export const MINIAPP_CONFIG = {
  name: "WOWOWIFY",
  description:
    "Create amazing visual overlays and effects directly in Farcaster",
  version: "1",
  categories: ["creative", "tools", "media"],
  tags: ["image", "overlay", "effects", "visual", "creative", "art"],
  primaryCategory: "creative",
  permissions: ["identity", "wallet"] as const,
} as const;

/**
 * Check if the app is running inside a Farcaster client
 */
export function isInMiniApp(): boolean {
  try {
    // Check for Mini App SDK availability
    if (typeof window !== "undefined" && window.parent !== window) {
      // Check for Farcaster-specific context
      return Boolean(
        (window as unknown as { farcaster?: unknown }).farcaster ||
          (window as unknown as { miniapp?: unknown }).miniapp ||
          frameSDK?.context,
      );
    }
    return false;
  } catch (error) {
    console.warn("Error checking Mini App context:", error);
    return false;
  }
}

/**
 * Initialize the Mini App SDK
 */
export async function initializeMiniApp() {
  try {
    if (isInMiniApp()) {
      // Initialize the frame SDK
      await frameSDK.actions.ready();
      console.log("Mini App initialized successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to initialize Mini App:", error);
    return false;
  }
}

/**
 * Get user context from the Mini App
 */
export async function getUserContext() {
  try {
    if (!isInMiniApp()) {
      return null;
    }

    const context = await frameSDK.context;
    return {
      user: context?.user || null,
      client: context?.client || null,
      location: context?.location || null,
    };
  } catch (error) {
    console.error("Failed to get user context:", error);
    return null;
  }
}

/**
 * Share content to Farcaster
 */
export async function shareToFarcaster(text: string, embeds?: string[]) {
  try {
    if (!isInMiniApp()) {
      console.warn("Share function only available in Mini App context");
      return false;
    }

    await frameSDK.actions.openUrl(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${embeds?.join(",") || ""}`,
    );
    return true;
  } catch (error) {
    console.error("Failed to share to Farcaster:", error);
    return false;
  }
}

/**
 * Close the Mini App
 */
export async function closeMiniApp() {
  try {
    if (isInMiniApp()) {
      await frameSDK.actions.close();
    }
  } catch (error) {
    console.error("Failed to close Mini App:", error);
  }
}

/**
 * Open URL in the Mini App or external browser
 */
export async function openUrl(url: string, external = false) {
  try {
    if (isInMiniApp()) {
      if (external) {
        await frameSDK.actions.openUrl(url);
      } else {
        // Open within the Mini App context
        window.location.href = url;
      }
    } else {
      window.open(url, external ? "_blank" : "_self");
    }
  } catch (error) {
    console.error("Failed to open URL:", error);
  }
}

/**
 * Send analytics event (if supported by the client)
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  try {
    if (isInMiniApp()) {
      // Track event through Mini App context
      console.log("Mini App Event:", eventName, properties);

      // If client supports custom events, send them
      // Note: frameSDK.context is a Promise, so we'd need to await it
      // For now, we'll just log it
    }

    // Fallback to regular analytics if available
    if (
      typeof window !== "undefined" &&
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    ) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        "event",
        eventName,
        properties,
      );
    }
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

/**
 * Generate Mini App embed metadata
 */
export function generateEmbedMetadata(
  imageUrl: string,
  buttonTitle: string,
  actionUrl?: string,
  splashImageUrl?: string,
) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://wowowify.vercel.app";

  return {
    version: "1",
    imageUrl,
    button: {
      title: buttonTitle,
      action: {
        type: "launch_frame",
        name: MINIAPP_CONFIG.name,
        url: actionUrl || `${appUrl}/frames`,
        splashImageUrl: splashImageUrl || `${appUrl}/wowwowowify.png`,
        splashBackgroundColor: "#131313",
      },
    },
  };
}

/**
 * Utility to create consistent meta tags for Mini App pages
 */
export function createMiniAppMetaTags(
  title: string,
  description: string,
  imageUrl: string,
  buttonTitle: string,
  actionUrl?: string,
) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://wowowify.vercel.app";
  const embedData = generateEmbedMetadata(imageUrl, buttonTitle, actionUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${MINIAPP_CONFIG.name} - ${title}`,
        },
      ],
      siteName: MINIAPP_CONFIG.name,
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [imageUrl],
    },
    other: {
      // Primary Mini App embed tag
      "fc:miniapp": JSON.stringify(embedData),
      // Legacy frame tag for backward compatibility
      "fc:frame": JSON.stringify(embedData),
      // Additional Mini App metadata
      "fc:miniapp:name": MINIAPP_CONFIG.name,
      "fc:miniapp:description": description,
      "fc:miniapp:icon": `${appUrl}/wowwowowify.png`,
      "fc:miniapp:splash": `${appUrl}/wowwowowify.png`,
      "fc:miniapp:splash-background": "#131313",
    },
  };
}

/**
 * Hook for Mini App lifecycle management
 */
export function useMiniAppLifecycle() {
  return {
    initialize: initializeMiniApp,
    getUserContext,
    share: shareToFarcaster,
    close: closeMiniApp,
    openUrl,
    trackEvent,
    isInMiniApp: isInMiniApp(),
  };
}
