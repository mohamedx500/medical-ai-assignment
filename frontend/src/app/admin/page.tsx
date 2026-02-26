"use client";

import { useEffect, useState } from "react";
import { Users, ShieldCheck, Stethoscope, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  const { t } = useI18n();
  const { token, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    async function fetchUsers() {
      try {
        const res = await fetch(`${API}/api/stats/users`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Admin fetch err", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [token, authLoading]);

  const doctorCount = users.filter((u) => u.role === "DOCTOR").length;
  const clientCount = users.filter((u) => u.role === "PATIENT").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("admin")}</h1>
        <p className="text-sm text-muted-foreground">{t("userManagement")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <Users className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{users.length || "—"}</p>
            <p className="text-xs text-muted-foreground">{t("totalUsers")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <Stethoscope className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{doctorCount || "—"}</p>
            <p className="text-xs text-muted-foreground">{t("doctors")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <UserCheck className="w-4 h-4 text-muted-foreground mb-2" />
            <p className="text-2xl font-bold">{clientCount || "—"}</p>
            <p className="text-xs text-muted-foreground">{t("clients")}</p>
          </CardContent>
        </Card>
      </div>

      {/* User list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("recentUsers")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {(user.full_name || user.email)?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {user.role || "client"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
