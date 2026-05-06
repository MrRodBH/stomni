import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardApi, type QueuePatient, type UrgencyLevel } from "@/lib/api";
import { Clock, RefreshCw, User } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — STOMNI" },
      { name: "description", content: "Acompanhe a fila de triagens em tempo real." },
    ],
  }),
  component: DashboardPage,
});

const MOCK: QueuePatient[] = [
  { id: "p1", name: "Maria Silva", reason: "Dor torácica há 30min", classification: "high", confidence: 0.92, waiting_since: new Date(Date.now() - 5*60000).toISOString(), last_messages: ["Sinto aperto no peito", "Falta de ar leve"] },
  { id: "p2", name: "João Pereira", reason: "Febre e dor de garganta", classification: "medium", confidence: 0.78, waiting_since: new Date(Date.now() - 12*60000).toISOString(), last_messages: ["Febre 38.5", "Dor há 2 dias"] },
  { id: "p3", name: "Ana Costa", reason: "Avaliação odontológica de rotina", classification: "low", confidence: 0.85, waiting_since: new Date(Date.now() - 22*60000).toISOString(), last_messages: ["Quero marcar limpeza"] },
];

function DashboardPage() {
  const [patients, setPatients] = useState<QueuePatient[]>(MOCK);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.list();
      if (Array.isArray(data) && data.length) setPatients(data);
    } catch {
      // Backend ainda não disponível — mantém mock
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fila de triagens</h1>
            <p className="text-sm text-muted-foreground">Pacientes aguardando avaliação clínica.</p>
          </div>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <div className={`h-1 w-full ${barColor(p.classification)}`} />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {minutesAgo(p.waiting_since)} min
                      </p>
                    </div>
                  </div>
                  <UrgencyChip level={p.classification} />
                </div>
                <p className="text-sm text-foreground">{p.reason}</p>
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  {p.last_messages.slice(-2).map((m, i) => (
                    <p key={i} className="truncate">"{m}"</p>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confiança IA: {Math.round(p.confidence * 100)}%</span>
                  <Button size="sm" variant="ghost">Atender</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function minutesAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function barColor(l: UrgencyLevel) {
  return l === "high" ? "bg-urgency-high" : l === "medium" ? "bg-urgency-medium" : "bg-urgency-low";
}

function UrgencyChip({ level }: { level: UrgencyLevel }) {
  const m = {
    low: { label: "Baixa", c: "bg-urgency-low" },
    medium: { label: "Média", c: "bg-urgency-medium" },
    high: { label: "Alta", c: "bg-urgency-high" },
  }[level];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${m.c}`}>{m.label}</span>
  );
}