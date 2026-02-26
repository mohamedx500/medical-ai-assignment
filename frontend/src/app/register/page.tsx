"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Mail, Lock, User, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("PATIENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await register(email, password, fullName, role);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Left branding panel ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-white" style={{ backgroundColor: "#08080a" }}>
        <div className="relative z-10 flex items-center gap-2.5">
          <Activity className="w-6 h-6" />
          <span className="text-lg font-semibold tracking-tight">MedAI</span>
        </div>
        <div className="relative z-10 space-y-4">
          <blockquote className="text-lg leading-relaxed">
            &ldquo;AI-powered medical diagnostic system combining Google Gemini AI
            and CLIPS expert system for intelligent, transparent healthcare analysis.&rdquo;
          </blockquote>
          <p className="text-sm text-zinc-400">
            Medical AI Expert System — v3.0
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-2.5 lg:hidden mb-4">
            <Activity className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold tracking-tight">MedAI</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t("register")}</h1>
            <p className="text-sm text-muted-foreground">
              Create an account to get started
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("fullName")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* ── Role toggle buttons ── */}
            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("PATIENT")}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={
                    role === "PATIENT"
                      ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6", color: "#fff" }
                      : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }
                  }
                >
                  <User className="w-4 h-4" />
                  {t("client")}
                </button>
                <button
                  type="button"
                  onClick={() => setRole("DOCTOR")}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  style={
                    role === "DOCTOR"
                      ? { backgroundColor: "#3b82f6", borderColor: "#3b82f6", color: "#fff" }
                      : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }
                  }
                >
                  <Stethoscope className="w-4 h-4" />
                  {t("doctor")}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("register")}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t("or")}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
            {t("continueAsGuest")}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
