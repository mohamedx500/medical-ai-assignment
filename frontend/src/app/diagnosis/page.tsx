"use client";

import { useState } from "react";
import { Stethoscope, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";

export default function DiagnosisPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [clipsResult, setClipsResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setGeminiResult(null);
    setClipsResult(null);

    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const body = {
      name,
      age: parseInt(age),
      gender,
      symptoms: symptoms.split(",").map((s) => s.trim()).filter(Boolean),
      severity,
      language: locale,
    };

    try {
      const [geminiRes, clipsRes] = await Promise.allSettled([
        fetch(`${API}/api/gemini/diagnose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => null);
            const detail = err?.detail;
            throw new Error(
              typeof detail === "object"
                ? detail.message
                : detail || `Gemini API error (${r.status})`
            );
          }
          return r.json();
        }),
        fetch(`${API}/api/clips/diagnose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body),
        }).then(async (r) => {
          if (!r.ok) {
            const err = await r.json().catch(() => null);
            const detail = err?.detail;
            throw new Error(
              typeof detail === "object"
                ? detail.message
                : detail || `CLIPS engine error (${r.status})`
            );
          }
          return r.json();
        }),
      ]);

      const errors: string[] = [];

      if (geminiRes.status === "fulfilled") {
        setGeminiResult(geminiRes.value.data || geminiRes.value.gemini || geminiRes.value);
      } else {
        errors.push(`Gemini: ${geminiRes.reason?.message || "Failed"}`);
      }

      if (clipsRes.status === "fulfilled") {
        setClipsResult(clipsRes.value.data || clipsRes.value.clips || clipsRes.value);
      } else {
        errors.push(`CLIPS: ${clipsRes.reason?.message || "Failed"}`);
      }

      if (errors.length > 0) {
        setError(errors.join(" • "));
      }
    } catch {
      setError("Failed to connect to the backend. Ensure the server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("diagnosis")}</h1>
        <p className="text-sm text-muted-foreground">{t("dualEngine")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> {t("patientInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("patientName")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("age")}</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("gender")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring dark:bg-input/30"
                      >
                        <span>{gender === "male" ? t("male") : t("female")}</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[160px] shadow-lg backdrop-blur-sm">
                      <DropdownMenuItem onClick={() => setGender("male")} className="cursor-pointer">
                        <span>{t("male")}</span>
                        {gender === "male" && <span className="ml-auto text-primary text-xs">✓</span>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setGender("female")} className="cursor-pointer">
                        <span>{t("female")}</span>
                        {gender === "female" && <span className="ml-auto text-primary text-xs">✓</span>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("symptoms")}</Label>
                <Textarea
                  placeholder="fever, headache, cough..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("severity")}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring dark:bg-input/30"
                    >
                      <span>{t(severity as any)}</span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[200px] shadow-lg backdrop-blur-sm">
                    {(["mild", "moderate", "severe", "critical"] as const).map((s) => (
                      <DropdownMenuItem key={s} onClick={() => setSeverity(s)} className="cursor-pointer">
                        <span>{t(s)}</span>
                        {severity === s && <span className="ml-auto text-primary text-xs">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("analyzing")}</> : t("runDiagnosis")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2">
          {error && (
            <Card className="border-destructive/50 mb-4">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {(geminiResult || clipsResult) ? (
            <Tabs defaultValue="gemini" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="gemini" className="flex-1">{t("geminiResults")}</TabsTrigger>
                <TabsTrigger value="clips" className="flex-1">{t("clipsResults")}</TabsTrigger>
              </TabsList>

              <TabsContent value="gemini">
                {geminiResult ? (
                  <Card>
                    <CardContent className="pt-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="font-medium text-base">{geminiResult.diagnosis || "—"}</h3>
                        <div className="flex gap-2 flex-wrap">
                          {geminiResult.urgency && <Badge variant="destructive">{geminiResult.urgency}</Badge>}
                          {geminiResult.confidence && <Badge variant="secondary">{geminiResult.confidence}</Badge>}
                        </div>
                      </div>

                      {/* Explanation */}
                      {geminiResult.explanation && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{geminiResult.explanation}</p>
                      )}

                      {/* Treatment Plan */}
                      {geminiResult.treatment_plan?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-primary">{t("treatmentPlan")}</p>
                          <ul className="text-sm text-muted-foreground space-y-1.5">
                            {geminiResult.treatment_plan.map((s: string, i: number) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-primary shrink-0">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Medications */}
                      {geminiResult.medications?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-primary">{t("medications")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {geminiResult.medications.map((m: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs whitespace-normal text-start">
                                {m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lifestyle */}
                      {geminiResult.lifestyle_recommendations?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2 text-primary">{t("lifestyle")}</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {geminiResult.lifestyle_recommendations.map((r: string, i: number) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Follow-up */}
                      {geminiResult.follow_up && (
                        <div>
                          <p className="text-xs font-semibold mb-1 text-primary">{t("followUp")}</p>
                          <p className="text-sm text-muted-foreground">{geminiResult.follow_up}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{t("noData")}</p></CardContent></Card>
                )}
              </TabsContent>

              <TabsContent value="clips">
                {clipsResult ? (
                  <Card>
                    <CardContent className="pt-5 space-y-3">
                      {Array.isArray(clipsResult) ? (
                        clipsResult.map((r: any, i: number) => (
                          <div key={i} className="border-b border-border last:border-0 pb-3 last:pb-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-medium">{r.diagnosis || r.condition}</p>
                              {r.urgency && <Badge variant="secondary">{r.urgency}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{r.explanation || r.description || r.recommendation}</p>
                          </div>
                        ))
                      ) : (
                        <div>
                          <p className="text-sm font-medium">{clipsResult.diagnosis || clipsResult.condition}</p>
                          <p className="text-xs text-muted-foreground mt-1">{clipsResult.explanation || clipsResult.description || JSON.stringify(clipsResult)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{t("noData")}</p></CardContent></Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[200px]">
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  {t("noData")}
                  <br />
                  <span className="text-xs">{t("fillFormHint")}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
