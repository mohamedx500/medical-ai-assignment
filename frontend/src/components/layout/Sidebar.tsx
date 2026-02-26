"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Stethoscope,
  ScanLine,
  BarChart3,
  Activity,
  X,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Navigation items configuration.
 * Each item maps to a route, icon, and i18n translation key.
 */
const baseNavItems = [
  { href: "/", icon: LayoutDashboard, labelKey: "dashboard" as const },
  { href: "/diagnosis", icon: Stethoscope, labelKey: "diagnosis" as const },
  { href: "/scanner", icon: ScanLine, labelKey: "imageScanner" as const },
  { href: "/analytics", icon: BarChart3, labelKey: "analytics" as const },
  { href: "/chat", icon: MessageSquare, labelKey: "chatbot" as const },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sidebar
 * ───────
 * Dark sidebar inspired by shadcn/ui dashboard examples.
 * Features a colored sidebar background with a fluid animated
 * background indicator that slides between navigation items using
 * framer-motion's `layoutId`.
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { isAdmin } = useAuth();

  // Build nav items — admin link only visible for DEVELOPER role
  const navItems = isAdmin
    ? [...baseNavItems, { href: "/admin", icon: ShieldCheck, labelKey: "admin" as const }]
    : baseNavItems;

  return (
    <>
      {/* ── Mobile backdrop overlay with fade ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel — dark colored background ── */}
      <aside
        className={cn(
          "fixed top-0 start-0 h-full w-64 z-50 flex flex-col",
          "bg-sidebar text-sidebar-foreground border-e border-sidebar-border",
          "lg:translate-x-0 rtl:lg:-translate-x-0 transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0 rtl:-translate-x-0" : "-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:-translate-x-0"
        )}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-5 h-16">
          <Link href="/" className="flex items-center gap-2.5 group" onClick={onClose}>
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 15 }}
            >
              <Activity className="w-5 h-5 text-sidebar-primary" />
            </motion.div>
            <span className="text-base font-semibold tracking-tight">MedAI</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Subtle divider ── */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* ── Navigation with fluid layoutId indicator ── */}
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                  "transition-colors duration-150",
                  isActive
                    ? "text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {/* ── Fluid sliding background (colored pill) ── */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-bg"
                    className="absolute inset-0 rounded-lg bg-sidebar-primary shadow-md"
                    transition={{
                      type: "spring" as const,
                      stiffness: 350,
                      damping: 30,
                      mass: 0.8,
                    }}
                  />
                )}

                {/* ── Icon with subtle scale on active ── */}
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
                  className="relative z-10"
                >
                  <item.icon className="w-4 h-4" />
                </motion.div>

                {/* ── Label ── */}
                <span className="relative z-10">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Subtle divider ── */}
        <div className="mx-4 h-px bg-sidebar-border" />

        {/* ── Bottom system status ── */}
        <div className="p-4">
          <div className="flex items-center gap-2.5">
            {/* Animated pulse dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{t("systemOnline")}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">
                {t("allEnginesActive")}
              </p>
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 bg-sidebar-accent text-sidebar-accent-foreground border-0"
            >
              v2.0
            </Badge>
          </div>
        </div>
      </aside>
    </>
  );
}
