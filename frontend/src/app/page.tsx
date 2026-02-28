"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Stethoscope,
  ScanLine,
  BarChart3,
  ArrowRight,
  Brain,
  Shield,
  FileCheck,
  Users,
  MessageSquare,
  Activity,
  Server,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import MotionCard, { containerVariants, cardVariants } from "@/components/ui/motion-card";

/**
 * DashboardPage
 * ─────────────
 * Fetches REAL statistics from the backend.
 * Renders different views based on user role.
 */
export default function DashboardPage() {
  const { t } = useI18n();
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait until auth state resolves
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${API}/api/stats/dashboard`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard fetch err", err);
        setLoading(false);
      });
  }, [token, authLoading]);

  const role = stats?.role || "PATIENT";
  const s = stats?.stats || {};

  // ── Build stat cards based on role ──
  const statCards =
    role === "DEVELOPER"
      ? [
        { label: t("totalAnalyses"), value: s.total_consultations ?? "—", icon: FileCheck },
        { label: t("activePatients"), value: s.total_patients ?? "—", icon: Users },
        { label: t("doctors"), value: s.total_doctors ?? "—", icon: Stethoscope },
        { label: t("scansProcessed"), value: s.total_image_scans ?? "—", icon: ScanLine },
      ]
      : role === "DOCTOR"
        ? [
          { label: t("totalAnalyses"), value: s.my_consultations ?? "—", icon: FileCheck },
          { label: t("activePatients"), value: s.total_patients ?? "—", icon: Users },
          { label: t("chatbot"), value: s.my_chat_sessions ?? "—", icon: MessageSquare },
          { label: t("scansProcessed"), value: s.my_scans ?? "—", icon: ScanLine },
        ]
        : [
          { label: t("totalAnalyses"), value: s.my_consultations ?? "—", icon: FileCheck },
          { label: t("chatbot"), value: s.my_chat_sessions ?? "—", icon: MessageSquare },
          { label: t("scansProcessed"), value: s.my_scans ?? "—", icon: ScanLine },
          { label: t("aiAccuracy"), value: "—", icon: Brain },
        ];

  const actions = [
    { label: t("startDiagnosis"), href: "/diagnosis", icon: Stethoscope, desc: "CLIPS + Gemini AI" },
    { label: t("scanImage"), href: "/scanner", icon: ScanLine, desc: "Gemini Vision" },
    { label: t("viewAnalytics"), href: "/analytics", icon: BarChart3, desc: t("monthlyTrends") },
    { label: t("chatbot"), href: "/chat", icon: MessageSquare, desc: t("aiAssistant") },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Welcome header ── */}
      <motion.div variants={cardVariants}>
        <h1 className="text-2xl font-semibold tracking-tight">{t("welcome")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          MedAI Expert System v3.0
          {role === "DEVELOPER" && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              <Code2 className="w-3 h-3 mr-1" /> Admin
            </Badge>
          )}
          {role === "DOCTOR" && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              <Stethoscope className="w-3 h-3 mr-1" /> {t("doctor")}
            </Badge>
          )}
        </p>
      </motion.div>

      {/* ── Stats grid ── */}
      <motion.div
        key={`stats-grid-${role}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card) => (
          <MotionCard key={card.label} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {loading ? "..." : card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </MotionCard>
        ))}
      </motion.div>

      {/* ── Developer: Extra system metrics ── */}
      {role === "DEVELOPER" && (
        <motion.div
          key={`extra-metrics-${role}`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <MotionCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("totalUsers")}</p>
            </div>
            <p className="text-xl font-bold">{s.total_users ?? "—"}</p>
          </MotionCard>
          <MotionCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Chat Sessions</p>
            </div>
            <p className="text-xl font-bold">{s.total_chat_sessions ?? "—"}</p>
          </MotionCard>
          <MotionCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
            <p className="text-xl font-bold">{s.total_messages ?? "—"}</p>
          </MotionCard>
        </motion.div>
      )}

      {/* ── Quick Actions ── */}
      <motion.div variants={cardVariants}>
        <h2 className="text-base font-medium mb-3">{t("quickActions")}</h2>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="block">
            <MotionCard className="h-full p-5 group cursor-pointer">
              <a.icon className="w-5 h-5 text-muted-foreground mb-3 transition-colors group-hover:text-primary" />
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
            </MotionCard>
          </Link>
        ))}
      </div>

      {/* ── Engine info ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MotionCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Google Gemini AI</p>
              <p className="text-xs text-muted-foreground">Generative Intelligence</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gemini 2.5 Flash for text diagnostics and multimodal image analysis
            with treatment plans and medication recommendations.
          </p>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {["Text", "Vision", "Multi-modal"].map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        </MotionCard>

        <MotionCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">CLIPS Expert System</p>
              <p className="text-xs text-muted-foreground">Rule-Based Reasoning</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NASA&apos;s CLIPS for deterministic rule-based medical reasoning
            with transparent, explainable diagnoses from clinical rules.
          </p>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {["Rules", "Deterministic", "Explainable"].map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        </MotionCard>
      </div>
    </motion.div>
  );
}
