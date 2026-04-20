"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/agent", label: "Agent", icon: "🤖" },
  { href: "/admin", label: "Gallery", icon: "🖼️" },
  { href: "/frames", label: "Frame", icon: "⚡" },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Detect system preference or stored preference
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <nav
      className={`glass sticky top-0 z-50 transition-shadow duration-300 ${
        isScrolled ? "shadow-md" : "shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-14">
          {/* Brand */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold transition-colors"
              style={{ color: "var(--color-wowowify)" }}
            >
              <span className="text-xl">🎨</span>
              <span className="hidden sm:inline tracking-tight">WOWOWIFY</span>
            </Link>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: "var(--color-wowowify)" }
                      : { color: "var(--color-text-secondary)" }
                  }
                >
                  <span className="text-sm">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-lg transition-all duration-200 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{ color: "var(--color-text-secondary)" }}
            >
              <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
