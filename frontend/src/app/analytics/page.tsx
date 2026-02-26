"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(200, 50%, 50%)",
];

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { token, loading } = useAuth();

  const [areaData, setAreaData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([{ name: "Loading...", value: 1 }]);

  useEffect(() => {
    if (loading) return;

    const fetchAnalytics = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API}/api/stats/analytics`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAreaData(data.areaData);
          setPieData(data.pieData);
        }
      } catch (e) {
        console.error("Failed to fetch analytics", e);
      }
    };
    fetchAnalytics();
  }, [token, loading]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("analytics")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("patientStatistics")} &amp; {t("diagnosisDistribution")}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Area Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> {t("monthlyTrends")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="colorDiag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d0d11",
                      border: "1px solid #1f1f28",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f5f5f5",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                    wrapperStyle={{ outline: "none" }}
                    labelStyle={{ color: "#f5f5f5" }}
                    itemStyle={{ color: "#f5f5f5" }}
                  />
                  <Area type="monotone" dataKey="patients" stroke="hsl(160, 60%, 45%)" fillOpacity={1} fill="url(#colorPat)" />
                  <Area type="monotone" dataKey="diagnosed" stroke="hsl(221, 83%, 53%)" fillOpacity={1} fill="url(#colorDiag)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("diagnosisDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0d0d11",
                      border: "1px solid #1f1f28",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f5f5f5",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    }}
                    wrapperStyle={{ outline: "none" }}
                    labelStyle={{ color: "#f5f5f5" }}
                    itemStyle={{ color: "#f5f5f5" }}
                    cursor={false}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px" }}
                    formatter={(value: string) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
