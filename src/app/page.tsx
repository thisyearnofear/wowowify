"use client";

import ImageOverlay from "@/components/ImageOverlay";
import Image from "next/image";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import { Suspense } from "react";
import { LoadingText } from "@/components/LoadingText";
import { STUDIO_COPY } from "@/lib/studio-copy";
import { StudioHero } from "@/components/studio/StudioHero";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex flex-col items-center gap-3 mb-2 animate-fadeInUp text-center">
            <Image
              src="/wowwowowify.png"
              alt="@toka"
              width={200}
              height={200}
              className="w-28 sm:w-32 h-auto drop-shadow-lg"
              priority
            />
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {STUDIO_COPY.name}
            </h1>
          </div>
          <StudioHero />
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <LoadingText />
              </div>
            }
          >
            <ImageOverlay />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
