"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * CircularRevealThemeToggle
 * ─────────────────────────
 * A single icon button that directly toggles between "light" and "dark"
 * themes. No dropdown menu — just click to switch.
 *
 * Uses the View Transitions API to create a circular clip-path reveal
 * animation expanding from the exact (x, y) coordinates of the click.
 *
 * Fallback: if the browser doesn't support View Transitions,
 * the theme switches instantly (no animation).
 *
 * How it works:
 * 1. On click, we capture the mouse (x, y) relative to the viewport.
 * 2. We calculate the maximum radius needed to cover the full screen
 *    from that point (pythagorean distance to the farthest corner).
 * 3. We start a View Transition, and inside the transition callback
 *    we actually change the theme class on <html>.
 * 4. CSS keyframes animate `::view-transition-new(root)` with a
 *    `clip-path: circle()` expanding from 0 to the full radius.
 */
export default function CircularRevealThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Toggle between light ↔ dark with a circular reveal animation
   * originating from the click coordinates.
   */
  const handleToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const newTheme = theme === "light" ? "dark" : "light";

      // ── Determine click origin ──
      const x = event.clientX;
      const y = event.clientY;

      // ── Calculate the maximum radius to cover the entire viewport ──
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // ── Store coordinates as CSS custom properties so the keyframe
      //    animation in globals.css can reference them ──
      document.documentElement.style.setProperty("--reveal-x", `${x}px`);
      document.documentElement.style.setProperty("--reveal-y", `${y}px`);
      document.documentElement.style.setProperty(
        "--reveal-radius",
        `${maxRadius}px`
      );

      // ── Check for View Transitions API support ──
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> };
      };

      if (!doc.startViewTransition) {
        // Fallback — instant switch
        setTheme(newTheme);
        return;
      }

      // ── Start the view transition ──
      // The callback is where the actual DOM mutation happens (theme change).
      // The browser snapshots old → runs callback → snapshots new → animates.
      const transition = doc.startViewTransition(() => {
        setTheme(newTheme);
      });

      // ── Once the pseudo-elements are ready, the CSS handles the rest ──
      transition.ready.catch(() => {
        // If the transition fails (e.g. user navigates away), silently ignore.
      });
    },
    [setTheme, theme]
  );

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      className="h-9 w-9 relative overflow-hidden"
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      {/* Skeleton / Placeholder state for SSR hydration sync */}
      {!mounted && <div className="w-4 h-4 opacity-0" />}

      {/* Sun icon — visible in light mode, rotates + scales out in dark */}
      {mounted && (
        <Sun
          className={`w-4 h-4 transition-all duration-500 absolute
            ${theme === "light"
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
            }`}
        />
      )}
      {/* Moon icon — visible in dark mode */}
      {mounted && (
        <Moon
          className={`w-4 h-4 transition-all duration-500 absolute
            ${theme === "light"
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
            }`}
        />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
