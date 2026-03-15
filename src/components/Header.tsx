"use client";

import Link from "next/link";
import { Leaf, Sun, Moon, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mockmint-theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mockmint-theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Leaf className="h-7 w-7 text-mint transition-transform group-hover:rotate-12" />
          <span className="text-xl font-bold tracking-tight">
            Mock<span className="text-mint">Mint</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/create"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Create
          </Link>
          <Link
            href="/papers"
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Papers
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card-bg hover:text-foreground"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card-bg hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card-bg hover:text-foreground"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-card-border px-4 py-3 sm:hidden">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/create"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Create
          </Link>
          <Link
            href="/papers"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Papers
          </Link>
        </nav>
      )}
    </header>
  );
}
