import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, Loader2, MessageSquare, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  adminTriageApi, patientsApi,
  type AdminTriageSessionItem, type TriageSession,
} from "@/lib/api";

export const Route = createFileRoute("/admin/triagens")({
  head: () => ({ meta: [{ title: "Admin · Triagens — STOMNI" }] }),
  component: TriagensPage,
});

type Filter = "all" | "gathering" | "assessment" | "emergency";

function TriagensPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const states = filter === "gathering" ? ["gathering"]
    : filter === "assessment" ? ["assessment"]
    : undefined;

  const listQ = useQuery({
    queryKey: ["admin-triage", filter],
    queryFn: () => adminTriageApi.list(states, 100),
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const patientsQ = useQuery({
    queryKey: ["admin-patients", "recurring-set", 2],
    queryFn: () => patientsApi.list(2, 500),
    staleTime: 60_000,
  });

  const recurringMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of patientsQ.data?.patients ?? []) {
      if (p.whatsapp_normalized) m.set(p.whatsapp_normalized, p.total_visits);
    }
    return m;
  }, [patientsQ.data]);

  const all = listQ.data ?? [];
  const visible = useMemo(() => {
    if (filter === "emergency") return all.filter((s) => s.is_emergency);
    return all;
  }, [all, filter]);

  const stats = useMemo(() => {
    const active = all.filter((s) => s.state !== "confirmed");
    return {
      total: active.length,
      emergencies: all.filter((s) => s.is_emergency).length,
      gathering: all.filter((s) => s.state === "gathering").length,
      assessment: all.filter((s) => s.state === "assessment").length,
    };
  }, [all]);

  const updatedAgo = listQ.dataUpdatedAt
    ? Math.max(0, Math.round((Date.now() - listQ.dataUpdatedAt) / 1000))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Triagens em Andamento</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe em tempo real os pacientes interagindo com o assistente.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {listQ.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {updatedAgo !== null ? <>Atualizado há {updatedAgo}s</> : <>—</>}
        </div>
      </div>

      {stats.emergencies > 0 && (
        <div
          className="flex items-start gap-2 rounded-md p-3 text-sm text-white"
          style={{ background: "var(--urgency-high)" }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            ⚠️ {stats.emergencies} emergência(s) detectada(s) — atender prioritariamente.
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total ativas" value={stats.total} />
        <StatCard label="Emergências" value={stats.emergencies} tone="danger" />
        <StatCard label="Aguardando paciente" value={stats.gathering} />
        <StatCard label="Em avaliação" value={stats.assessment} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBtn current={filter} v="all" set={setFilter}>Todas</FilterBtn>
        <FilterBtn current={filter} v="gathering" set={setFilter}>Em Coleta</FilterBtn>
        <FilterBtn current={filter} v="assessment" set={setFilter}>Avaliadas</FilterBtn>
        <FilterBtn current={filter} v="emergency" set={setFilter}>Emergências</FilterBtn>
      </div>

      <Card className="overflow-hidden">
        {listQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma sessão para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Queixa principal</th>
                  <th className="px-3 py-2">Urgência</th>
                  <th className="px-3 py-2">Especialidade</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Turnos</th>
                  <th className="px-3 py-2">Atualizado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    recurringVisits={
                      s.patient_whatsapp_normalized
                        ? recurringMap.get(s.patient_whatsapp_normalized) ?? null
                        : null
                    }
                    onOpen={() => setOpenId(s.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DetailSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 text-2xl font-bold " + (tone === "danger" && value > 0 ? "text-destructive" : "")
        }
      >
        {value}
      </p>
    </Card>
  );
}

function FilterBtn({
  current, v, set, children,
}: { current: Filter; v: Filter; set: (f: Filter) => void; children: React.ReactNode }) {
  const active = current === v;
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={() => set(v)}>
      {children}
    </Button>
  );
}

function SessionRow({
  s, onOpen, recurringVisits,
}: {
  s: AdminTriageSessionItem;
  onOpen: () => void;
  recurringVisits: number | null;
}) {
  const status = s.is_emergency
    ? { cls: "bg-destructive text-destructive-foreground animate-pulse", label: "Emergência" }
    : (s.urgency_score ?? 0) >= 4
    ? { cls: "bg-yellow-500 text-white", label: "Atenção" }
    : { cls: "bg-emerald-600 text-white", label: "Normal" };

  const queixa = s.main_complaint || (s.last_user_message ? truncate(s.last_user_message, 60) : "—");

  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="px-3 py-2">
        <span className={"inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold " + status.cls}>
          {status.label}
        </span>
      </td>
      <td className="max-w-[260px] truncate px-3 py-2">{queixa}</td>
      <td className="px-3 py-2">
        {recurringVisits ? (
          <span
            title={`${recurringVisits} visitas anteriores`}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
          >
            🔁 Recorrente
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <Badge variant="outline">{s.urgency_score != null ? `${s.urgency_score}/10` : "—"}</Badge>
      </td>
      <td className="px-3 py-2">{s.specialty || "—"}</td>
      <td className="px-3 py-2">
        <Badge variant="secondary">{s.state}</Badge>
      </td>
      <td className="px-3 py-2 tabular-nums">{s.turn_count}</td>
      <td className="px-3 py-2 text-muted-foreground">há {s.minutes_since_update} min</td>
      <td className="px-3 py-2 text-right">
        <Button size="sm" variant="ghost" onClick={onOpen}>Ver detalhes</Button>
      </td>
    </tr>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function DetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const open = !!id;
  const detailQ = useQuery({
    queryKey: ["admin-triage", "detail", id],
    queryFn: () => adminTriageApi.getDetail(id!),
    enabled: open,
  });
  const d = detailQ.data;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Detalhes da sessão</SheetTitle>
          <SheetDescription>Conversa, dados extraídos e avaliação clínica.</SheetDescription>
        </SheetHeader>

        {detailQ.isLoading && (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {d && (
          <div className="mt-6 space-y-6">
            <Section icon={MessageSquare} title="Conversa">
              <div className="max-h-[40vh] space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-3">
                {d.messages.map((m, i) => (
                  <div
                    key={i}
                    className={
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm " +
                      (m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-card border border-border")
                    }
                  >
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Dados extraídos">
              <KV label="Queixa principal" value={d.extracted.main_complaint} />
              <KV
                label="Intensidade da dor"
                value={d.extracted.pain_intensity != null ? `${d.extracted.pain_intensity}/10` : null}
              />
              <KV label="Duração" value={d.extracted.duration} />
              <KV
                label="Sintomas associados"
                value={d.extracted.associated_symptoms?.length ? d.extracted.associated_symptoms.join(", ") : null}
              />
            </Section>

            <Section title="Avaliação">
              <KV label="Score de urgência" value={d.urgency_score != null ? `${d.urgency_score}/10` : null} />
              <KV label="Especialidade" value={d.specialty} />
              <KV label="Emergência" value={d.is_emergency ? "Sim" : "Não"} />
              <KV label="Estado" value={d.state} />
              {d.linked_triage_id && <KV label="Protocolo" value={d.linked_triage_id} />}
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title, icon: Icon, children,
}: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

// Re-export type for use here
export type { TriageSession };
