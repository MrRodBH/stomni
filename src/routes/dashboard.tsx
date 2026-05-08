import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Activity, AlarmClock, Stethoscope, TrendingUp } from "lucide-react";
import { analyticsApi, type AnalyticsMetrics } from "@/lib/api";
import { RequireAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — STOMNI" },
      { name: "description", content: "Volume e mix de atendimentos da clínica." },
    ],
  }),
  component: DashboardPage,
});

type Range = "hour" | "day" | "month" | "custom";

function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const [range, setRange] = useState<Range>("day");
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.metrics(range)
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Volume e mix de atendimentos da clínica.</p>
          </div>
          <div className="w-44">
            <Select value={range} onValueChange={(v) => setRange(v as Range)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Por hora</SelectItem>
                <SelectItem value="day">Por dia</SelectItem>
                <SelectItem value="month">Por mês</SelectItem>
                <SelectItem value="custom">Período customizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Activity} label="Em andamento" value={loading ? null : metrics?.in_progress ?? 0} />
          <Kpi icon={Stethoscope} label="Abertos agora" value={loading ? null : metrics?.open_now ?? 0} />
          <Kpi icon={AlarmClock} label="Espera média" value={loading ? null : `${metrics?.avg_wait_minutes ?? 0} min`} />
          <Kpi icon={TrendingUp} label="NPS médio" value={loading ? null : (metrics?.nps_avg ?? 0).toFixed(1)} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <Card className="p-5 lg:col-span-3">
            <h2 className="text-sm font-semibold">Volume de atendimentos</h2>
            <p className="text-xs text-muted-foreground">Evolução conforme o filtro selecionado.</p>
            <div className="mt-4 h-72">
              {loading || !metrics ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.volume_series} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-primary)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--color-primary)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold">Mix por tipo</h2>
            <p className="text-xs text-muted-foreground">Emergências destacadas em vermelho.</p>
            <div className="mt-4 h-72">
              {loading || !metrics ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.mix} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {metrics.mix.map((m) => (
                        <Cell
                          key={m.type}
                          fill={
                            m.type === "emergencia"
                              ? "var(--color-urgency-high)"
                              : m.type === "cancelamento"
                              ? "var(--color-urgency-medium)"
                              : "var(--color-primary)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value,
}: { icon: any; label: string; value: number | string | null }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-16" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}
