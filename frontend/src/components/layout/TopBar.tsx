"use client";

import { Menu, Search, Languages, LogOut, User, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import CircularRevealThemeToggle from "@/components/ui/circular-reveal-toggle";

interface TopBarProps {
  onMenuClick: () => void;
}

/**
 * UserMenu — shows user info or login/register for guests
 */
function UserMenu() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (user) {
    const initial = (user.full_name || user.email)?.[0]?.toUpperCase() || "U";
    const displayName = user.full_name || user.email.split("@")[0];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
              {initial}
            </div>
            <span className="hidden sm:inline text-sm">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px] shadow-lg backdrop-blur-sm">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { logout(); router.push("/login"); }}
            className="gap-2 cursor-pointer text-destructive"
          >
            <LogOut className="w-4 h-4" /> {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            G
          </div>
          <span className="hidden sm:inline text-sm">{t("guest")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px] shadow-lg backdrop-blur-sm">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("guest")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href="/login">
            <User className="w-4 h-4" /> {t("login")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href="/register">
            <UserPlus className="w-4 h-4" /> {t("register")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      {/* ── Left: Mobile menu + Search ── */}
      <div className="flex items-center gap-3 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9"
          onClick={onMenuClick}
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div className="hidden sm:flex items-center flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t("search")}
              className="pl-9 h-9 bg-muted/50"
            />
          </div>
        </div>
      </div>

      {/* ── Right: Theme + Language + User ── */}
      <div className="flex items-center gap-1">
        <CircularRevealThemeToggle />

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Languages className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px] shadow-lg backdrop-blur-sm">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t("language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocale("en")} className="gap-2 cursor-pointer">
              <span>English</span>
              {locale === "en" && <span className="ml-auto text-primary text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale("ar")} className="gap-2 cursor-pointer">
              <span>العربية</span>
              {locale === "ar" && <span className="ml-auto text-primary text-xs">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
