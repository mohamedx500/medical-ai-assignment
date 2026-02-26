"use client";

import { useState, useCallback } from "react";
import { ScanLine, Upload, Loader2, X, ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";

export default function ScannerPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResults(null);
    setError("");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      formData.append("file", file);

      // Build query string with language and optional prompt
      const params = new URLSearchParams({ language: locale });
      if (prompt.trim()) params.append("prompt", prompt.trim());

      const res = await fetch(`${API}/api/gemini/analyze-image?${params}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const detail = err?.detail;
        const msg = typeof detail === "object" ? detail.message : detail || `Analysis failed (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();
      setResults(data.data || data);
    } catch (err: any) {
      console.error("[Scanner] Error:", err);
      setError(err.message || "Failed to analyze image. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setPrompt("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("imageScanner")}</h1>
        <p className="text-sm text-muted-foreground">{t("poweredByGemini")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" /> {t("uploadImage")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!file ? (
              <label
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground text-center">{t("dropzone")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("supportedFormats")}</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={preview!}
                    alt="Upload preview"
                    className="w-full h-48 object-contain rounded-lg bg-muted"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-background/80"
                    onClick={clearFile}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground truncate">{file.name}</p>
              </div>
            )}

            {/* ── Multimodal text prompt ── */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {locale === "ar"
                  ? "أضف سياقاً أو اطرح سؤالاً محدداً"
                  : "Add context or ask a specific question"}
              </Label>
              <Textarea
                placeholder={
                  locale === "ar"
                    ? "ما هذا الورم؟ · اقترح خطة علاجية..."
                    : "What is this tumor? · Suggest a treatment plan..."
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            <Button className="w-full" onClick={handleAnalyze} disabled={loading || !file}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("analyzing")}</>
              ) : (
                <><ScanLine className="w-4 h-4 mr-2" />{t("analyze")}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div>
          {error && (
            <Card className="border-destructive/50 mb-4">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {results ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("scanResults")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-sm">{results.tumor_type || results.findings || t("noData")}</p>
                  {results.severity && <Badge variant="secondary">{results.severity}</Badge>}
                </div>

                {/* Findings */}
                {results.findings && (
                  <div>
                    <p className="text-xs font-semibold mb-1 text-primary">{t("findings")}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{results.findings}</p>
                  </div>
                )}

                {/* Location */}
                {results.location && (
                  <div>
                    <p className="text-xs font-semibold mb-1 text-primary">{t("location")}</p>
                    <p className="text-sm text-muted-foreground">{results.location}</p>
                  </div>
                )}

                {/* Characteristics */}
                {results.characteristics?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-primary">{t("characteristics")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {results.characteristics.map((c: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs whitespace-normal text-start">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Treatment */}
                {results.treatment?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-primary">{t("treatment")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {results.treatment.map((item: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary shrink-0">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prevention */}
                {results.prevention?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-primary">{t("prevention")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {results.prevention.map((item: string, i: number) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Additional Tests */}
                {results.additional_tests?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-primary">{t("additionalTests")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {results.additional_tests.map((item: string, i: number) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Confidence */}
                {results.confidence_score && (
                  <p className="text-xs text-muted-foreground">
                    {t("confidence")}: {results.confidence_score}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[200px]">
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  {t("noData")}
                  <br />
                  <span className="text-xs">{t("uploadHint")}</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
