"use client";

import ImageOverlay from "@/components/ImageOverlay";
import Image from "next/image";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex flex-col items-center gap-4 mb-6 animate-fadeInUp">
            <Image
              src="/wowwowowify.png"
              alt="WOWOWIFY"
              width={200}
              height={200}
              className="w-32 h-auto drop-shadow-lg"
              priority
            />
          </div>
          <ImageOverlay />
        </div>
      </main>
      <Footer />
    </div>
  );
}
