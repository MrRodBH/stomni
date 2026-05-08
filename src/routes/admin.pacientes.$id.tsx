import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Stethoscope, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { patientsApi, type PatientProfileDetail, type PatientTriageRecord } from "@/lib/api";
import { classBadge, relativeTime } from "./admin.pacientes";

export const Route = createFileRoute("/admin/pacientes/$id")({
  head: () => ({ meta: [{ title: "Paciente — STOMNI" }] }),
  component: PatientDetailPage,
});

function PatientDetailPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["admin-patient", id],
    queryFn: () => patientsApi.get(id),
    staleTime: 30_000,
  });

  const p = q.data;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {q.isLoading || !p ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <Card className="p-5">
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.whatsapp} · {p.total_visits} visita{p.total_visits === 1 ? "" : "s"} · desde{" "}
              {new Date(p.first_seen_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
            </p>
          </Card>

          <Summary p={p} />

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico de triagens
            </h2>
            <div className="space-y-3">
              {p.triages.map((t) => <TriageCard key={t.protocol} t={t} />)}
              {p.triages.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma triagem registrada.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ p }: { p: PatientProfileDetail }) {
  const counts = new Map<string, number>();
  for (const s of p.specialties_history) {
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const breakdown = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v})`)
    .join(", ");

  return (
    <Card className="space-y-2 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumo</h2>
      <p className="text-sm"><b>Total de visitas:</b> {p.total_visits}</p>
      <p className="text-sm"><b>Especialidades:</b> {breakdown || "—"}</p>
      <p className="text-sm">
        <b>Última visita:</b>{" "}
        {new Date(p.last_seen_at).toLocaleDateString("pt-BR")} ({relativeTime(p.last_seen_at)})
      </p>
    </Card>
  );
}

function TriageCard({ t }: { t: PatientTriageRecord }) {
  const date = t.date
    ? new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")
    : new Date(t.created_at).toLocaleDateString("pt-BR");
  return (
    <Card className="p-4 transition hover:bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{date} {t.time && <>· {t.time}</>}</span>
          <span className="text-muted-foreground">· {t.protocol}</span>
        </div>
        {classBadge(t.classification ?? null)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {t.specialty && (
          <span className="inline-flex items-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" /> {t.specialty}
          </span>
        )}
        {t.clinic_name && (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> {t.clinic_name}
          </span>
        )}
      </div>
      {t.main_complaint && (
        <p className="mt-2 text-sm italic text-foreground">“{t.main_complaint}”</p>
      )}
    </Card>
  );
}