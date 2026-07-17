"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { ImageRecord } from "@/lib/metrics";
import { STUDIO_COPY } from "@/lib/studio-copy";

function AdminContent() {
  // --- Auth state (must be declared before any conditional return) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");

  // --- Gallery state (must be declared before any conditional return) ---
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setAuthError("");
      } else {
        setAuthError("Incorrect password");
      }
    } catch {
      setAuthError("Authentication failed");
    }
  };

  // Use useCallback to memoize the fetchImages function
  const fetchImages = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();

      // Filter to records with a usable asset URL (campaign + legacy Grove)
      const validImages = (data.history || [])
        .filter(
          (img: ImageRecord) =>
            Boolean(img.resultUrl || img.groveUrl),
        )
        .sort((a: ImageRecord, b: ImageRecord) => {
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        })
        .slice(0, 12);

      setImages(validImages);
      setError("");
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error in fetchImages:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load images"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchImages();
    }
  }, [fetchImages, isAuthenticated]);

  // Prefer persistent campaign URLs; fall back to Grove when present.
  const getBestImageUrl = (image: ImageRecord): string => {
    if (image.resultUrl) {
      if (image.resultUrl.startsWith("https://ipfs.io/ipfs/")) {
        return `/api/proxy?url=${encodeURIComponent(image.resultUrl)}`;
      }
      return image.resultUrl;
    }
    if (image.groveUrl) {
      if (image.groveUrl.startsWith("https://ipfs.io/ipfs/")) {
        return `/api/proxy?url=${encodeURIComponent(image.groveUrl)}`;
      }
      return image.groveUrl;
    }
    return "";
  };

  // --- Auth gate (after all hooks) ---
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Navigation />
        <div className="flex justify-center mb-4">
          <Image
            src="/wowwowowify.png"
            alt="@toka"
            width={200}
            height={200}
            className="w-32 h-auto"
            priority
          />
        </div>
        <div className="max-w-sm mx-auto mt-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-bold text-center">{STUDIO_COPY.admin.title}</h2>
            <p className="text-sm text-center text-gray-500">
              {STUDIO_COPY.admin.subtitle}
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              autoFocus
            />
            {authError && (
              <p className="text-sm text-red-600 text-center">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Authenticated admin content ---
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Navigation />

      <div className="flex justify-center mb-6">
        <Image
          src="/wowwowowify.png"
          alt="@toka"
          width={200}
          height={200}
          className="w-32 h-auto"
          priority
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-center mb-4">{STUDIO_COPY.admin.title}</h2>

        {isInitialLoad || loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-center">
            <p>{error}</p>
            <button
              onClick={fetchImages}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Retry
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No campaign artwork yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-gray-100 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-square">
                  <Image
                    src={getBestImageUrl(image)}
                    alt={`Generated image ${image.id}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {new Date(image.timestamp).toLocaleDateString()}
                  </span>
                  {image.groveUrl && (
                    <a
                      href={image.groveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      Grove
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh button at the bottom */}
      <div className="flex justify-center mt-6 mb-8">
        <button
          onClick={fetchImages}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <AdminContent />;
}
