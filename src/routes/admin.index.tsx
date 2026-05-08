import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, LineChart, Line, Cell,
} from "recharts";
import {
  Activity, AlertTriangle, BarChart3, CalendarIcon, Download, Sparkles, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  abandonmentApi,
  advancedAnalyticsApi,
  analyticsApi,
  type AbandonmentAnalytics,
  type AdvancedAnalytics,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin · Dashboard executivo — STOMNI" },
      { name: "description", content: "KPIs, heatmap, funil e tendências em tempo real." },
    ],
  }),
  component: AdminDashboard,
});

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const SPECIALTY_COLORS = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#dc2626", "#0891b2",
];

function AdminDashboard() {
  const [from, setFrom] = useState<Date>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date>(new Date());

  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");

  const advQuery = useQuery({
    queryKey: ["analytics-advanced", fromStr, toStr],
    queryFn: () => advancedAnalyticsApi.get(fromStr, toStr),
    staleTime: 60_000,
  });

  const insightsQuery = useQuery({
    queryKey: ["analytics-metrics", "day"],
    queryFn: () => analyticsApi.metrics("day"),
    staleTime: 60_000,
  });

  const data = advQuery.data;

  const abandonQuery = useQuery({
    queryKey: ["analytics-abandonment", fromStr, toStr],
    queryFn: () => abandonmentApi.get(fromStr, toStr),
    staleTime: 60_000,
  });

  const setShortcut = (s: "7" | "30" | "90" | "this" | "last") => {
    const today = new Date();
    if (s === "7") { setFrom(subDays(today, 7)); setTo(today); }
    else if (s === "30") { setFrom(subDays(today, 30)); setTo(today); }
    else if (s === "90") { setFrom(subDays(today, 90)); setTo(today); }
    else if (s === "this") { setFrom(startOfMonth(today)); setTo(today); }
    else if (s === "last") {
      const lm = subMonths(today, 1);
      setFrom(startOfMonth(lm)); setTo(endOfMonth(lm));
    }
  };

  const handleExport = () => {
    const url = advancedAnalyticsApi.exportCsvUrl(fromStr, toStr);
    window.open(url, "_blank");
    toast.success("Download iniciado");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">
            Métricas avançadas, heatmap de uso e funil de conversão.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePickerButton label="De" value={from} onChange={setFrom} />
          <DatePickerButton label="Até" value={to} onChange={setTo} />
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => setShortcut("7")}>7d</Button>
            <Button size="sm" variant="outline" onClick={() => setShortcut("30")}>30d</Button>
            <Button size="sm" variant="outline" onClick={() => setShortcut("90")}>90d</Button>
            <Button size="sm" variant="outline" onClick={() => setShortcut("this")}>Este mês</Button>
            <Button size="sm" variant="outline" onClick={() => setShortcut("last")}>Mês passado</Button>
          </div>
          <Button size="sm" onClick={handleExport} disabled={!data}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </header>

      {advQuery.isError && (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive">Erro ao carregar analytics.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => advQuery.refetch()}>
            Tentar novamente
          </Button>
        </Card>
      )}

      {advQuery.isLoading && <DashboardSkeleton />}

      {data && data.totals.triages === 0 && (
        <Card className="p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 font-semibold">Sem dados no período selecionado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Triagens aparecerão aqui assim que pacientes começarem a usar o assistente.
          </p>
        </Card>
      )}

      {data && data.totals.triages > 0 && (
        <DashboardContent
          data={data}
          insights={insightsQuery.data?.ai_insights ?? []}
          abandonment={abandonQuery.data}
        />
      )}
    </div>
  );
}

function DashboardContent({
  data, insights, abandonment,
}: {
  data: AdvancedAnalytics;
  insights: string[];
  abandonment?: AbandonmentAnalytics;
}) {
  const funnelData = useMemo(() => {
    const top = data.funnel[0]?.value || 1;
    return data.funnel.map((f) => ({
      ...f,
      pct: Math.round((f.value / top) * 100),
    }));
  }, [data.funnel]);

  const csatData = useMemo(
    () => Object.entries(data.csat_histogram)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([score, count]) => ({ score, count })),
    [data.csat_histogram],
  );

  const heatmapMax = useMemo(
    () => Math.max(1, ...data.heatmap_dow_hour.flat()),
    [data.heatmap_dow_hour],
  );

  return (
    <>
      {/* Stat cards (4) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Triagens no período" value={data.totals.triages} />
        <StatCard label="Sessões iniciadas" value={data.totals.sessions_started} />
        <StatCard label="Agendamentos confirmados" value={data.totals.sessions_confirmed} />
        <StatCard label="Atendimentos realizados" value={data.totals.completed} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${data.kpis.conversion_rate_pct.toFixed(1)}%`}
          sub="Sessões → Agendamentos confirmados"
          tone={data.kpis.conversion_rate_pct >= 30 ? "good" : data.kpis.conversion_rate_pct >= 10 ? "warn" : "bad"}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Taxa de Emergência"
          value={`${data.kpis.emergency_rate_pct.toFixed(1)}%`}
          sub="Triagens classificadas como urgência alta"
          tone="neutral"
        />
        <KpiCard
          icon={Activity}
          label="Score Médio de Urgência"
          value={data.kpis.avg_urgency_score.toFixed(1)}
          sub="Média ponderada (0-10) das classificações da IA"
          tone="neutral"
        />
      </div>

      {/* Heatmap */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Padrão de Uso por Dia/Hora</h2>
        <p className="text-xs text-muted-foreground">
          Cor mais escura = mais triagens. Passe o mouse para ver detalhes.
        </p>
        <div className="mt-4 overflow-x-auto">
          <Heatmap matrix={data.heatmap_dow_hour} max={heatmapMax} />
        </div>
      </Card>

      {/* Stacked area: urgency timeline */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">Volume de Triagens por Urgência</h2>
        <p className="text-xs text-muted-foreground">Tendência ao longo do período.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.urgency_timeline.map(d => ({
              ...d,
              date: format(new Date(d.date), "dd/MM"),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="low" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.6} name="Baixa" />
              <Area type="monotone" dataKey="medium" stackId="1" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.6} name="Média" />
              <Area type="monotone" dataKey="high" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} name="Alta" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Funnel + Specialty trend */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Funil: do Primeiro Contato ao Atendimento</h2>
          <p className="text-xs text-muted-foreground">Conversão entre etapas.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="stage" fontSize={11} width={120} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: any, _n, p: any) => [`${v} (${p.payload.pct}%)`, "Quantidade"]} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold">Especialidades Mais Solicitadas</h2>
          <p className="text-xs text-muted-foreground">Top {data.specialty_trend.specialties.length} ao longo do tempo.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.specialty_trend.data.map(d => ({
                ...d,
                date: format(new Date(d.date as string), "dd/MM"),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.specialty_trend.specialties.slice(0, 6).map((s, i) => (
                  <Line key={s} type="monotone" dataKey={s} stroke={SPECIALTY_COLORS[i % SPECIALTY_COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {abandonment && <AbandonmentCard data={abandonment} />}

      {/* CSAT + Insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Satisfação dos Pacientes (1–5)</h2>
          <p className="text-xs text-muted-foreground">Distribuição de notas recebidas.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={csatData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="score" fontSize={11} stroke="var(--color-muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {csatData.map((c) => (
                    <Cell key={c.score} fill={
                      Number(c.score) >= 4 ? "#16a34a" :
                      Number(c.score) === 3 ? "#ca8a04" : "#dc2626"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Insights da IA</h2>
          </div>
          <p className="text-xs text-muted-foreground">Principais padrões observados.</p>
          {insights.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem insights disponíveis.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {insights.map((t, i) => (
                <li key={i} className="flex gap-2 rounded-md bg-muted/40 p-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-md border border-dashed bg-accent/30 p-3 text-xs text-muted-foreground">
            💡 Quer relatório semanal automático por email? Configure em{" "}
            <span className="font-medium text-foreground">/admin/configuracoes → Relatórios Semanais</span>.
          </div>
        </Card>
      </div>
    </>
  );
}

function Heatmap({ matrix, max }: { matrix: number[][]; max: number }) {
  const cell = 22;
  return (
    <div className="inline-block min-w-full">
      <div className="flex">
        <div style={{ width: 36 }} />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} style={{ width: cell }} className="text-center text-[10px] text-muted-foreground">
            {h}
          </div>
        ))}
      </div>
      {matrix.slice(0, 7).map((row, di) => (
        <div key={di} className="flex items-center">
          <div style={{ width: 36 }} className="text-[11px] text-muted-foreground">{DOW[di]}</div>
          {row.slice(0, 24).map((v, hi) => {
            const opacity = v === 0 ? 0.05 : 0.15 + (v / max) * 0.85;
            return (
              <div
                key={hi}
                title={`${DOW[di]} às ${hi}h: ${v} triagens`}
                style={{
                  width: cell, height: cell,
                  background: `rgba(37, 99, 235, ${opacity})`,
                }}
                className="m-[1px] rounded-sm"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DatePickerButton({
  label, value, onChange,
}: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span className="text-xs text-muted-foreground">{label}:</span>
          {format(value, "dd/MM/yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { if (d) { onChange(d); setOpen(false); } }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value.toLocaleString("pt-BR")}</p>
    </Card>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, tone,
}: {
  icon: any; label: string; value: string; sub: string;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const toneColor = {
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
    neutral: "text-foreground",
  }[tone];
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-3xl font-bold leading-tight", toneColor)}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-72" />
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
} as const;
