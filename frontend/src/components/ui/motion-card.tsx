"use client";

import { useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * MotionCard
 * ──────────
 * An interactive card with:
 * - Subtle scale on hover (1.02)
 * - Mouse-tracking gradient glow border that follows the cursor
 * - Glassmorphism backdrop blur
 * - Spring-based entrance animation (used with stagger from parent)
 *
 * The glow effect works by tracking mouse position relative to the
 * card, then applying a radial-gradient positioned at (mouseX, mouseY)
 * to a pseudo-layer. This creates the "spotlight border" effect.
 */

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  /** Disable the hover glow border effect */
  noGlow?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// ── Framer Motion variant for staggered entrance ──
// Parent should use `staggerChildren` and children use this variant.
export const cardVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
    },
  },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export default function MotionCard({
  children,
  className,
  noGlow = false,
  onClick,
}: MotionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // ── Mouse position relative to card (for glow effect) ──
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  /**
   * Track mouse position within the card boundaries.
   * We use this to position a radial gradient glow
   * that follows the cursor — creating a spotlight effect.
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || noGlow) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        // ── Base card styles ──
        "relative rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        // ── Glassmorphism ──
        "backdrop-blur-sm bg-card/80",
        // ── Smooth transitions for non-transform properties ──
        "transition-shadow duration-300",
        // ── Elevated shadow on hover ──
        isHovered && "shadow-lg shadow-primary/5",
        // ── Cursor pointer if clickable ──
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* ── Glow border overlay ──
          A radial gradient that follows the mouse cursor,
          masked to only show around the border edges. */}
      {!noGlow && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-100 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(
              250px circle at ${mousePos.x}px ${mousePos.y}px,
              hsl(var(--primary) / 0.15),
              transparent 80%
            )`,
            // Mask so the glow only appears as a border highlight
            mask: `
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0)
            `,
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />
      )}

      {/* ── Inner glow (subtle ambient light under cursor) ── */}
      {!noGlow && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-60 transition-opacity duration-500 z-0"
          style={{
            background: `radial-gradient(
              300px circle at ${mousePos.x}px ${mousePos.y}px,
              hsl(var(--primary) / 0.04),
              transparent 70%
            )`,
          }}
        />
      )}

      {/* ── Card content ── */}
      <div className="relative z-20">{children}</div>
    </motion.div>
  );
}
