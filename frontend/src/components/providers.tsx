"use client";

import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/lib/auth";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={["light", "dark", "black"]}
      enableSystem={false}
    >
      <I18nProvider>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
