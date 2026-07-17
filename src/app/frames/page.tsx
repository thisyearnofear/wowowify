"use client";

import dynamic from "next/dynamic";

// Dynamically import the Mini App UI because it depends on browser APIs.
const FrameContent = dynamic(() => import("./FrameContent"), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-center text-white">Loading frame...</div>
  ),
});

export default function FramePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-900">
      <FrameContent />
    </div>
  );
}
