"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-hover"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4.5 w-4.5">
          <circle cx="12" cy="12" r="4.5" />
          <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M20.5 14.5a8.5 8.5 0 1 1-9-13.4 7 7 0 0 0 9 13.4Z" />
        </svg>
      )}
    </button>
  );
}
