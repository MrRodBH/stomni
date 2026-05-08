import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { patientsApi, type PatientProfileSummary } from "@/lib/api";

export const Route = createFileRoute("/admin/pacientes")({
  head: () => ({ meta: [{ title: "Admin · Pacientes — STOMNI" }] }),
  component: PacientesPage,
});

function PacientesPage() {
  const [minVisits, setMinVisits] = useState(2);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-patients", minVisits],
    queryFn: () => patientsApi.list(minVisits, 100),
    staleTime: 60_000,
  });

  const patients = q.data?.patients ?? [];
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.whatsapp || "").toLowerCase().includes(s) ||
        (p.whatsapp_normalized || "").includes(s.replace(/\D/g, "")),
    );
  }, [patients, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="h-6 w-6" /> Pacientes Recorrentes
        </h1>
        <p className="text-sm text-muted-foreground">
          Histórico longitudinal de pacientes que voltaram à clínica em múltiplas triagens.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mínimo de visitas</span>
          <Select value={String(minVisits)} onValueChange={(v) => setMinVisits(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 5, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}+</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp"
            className="pl-8"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {q.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {patients.length === 0
              ? "Nenhum paciente recorrente ainda. A IA já está reconhecendo todos os pacientes que voltarem; eles aparecerão aqui assim que tiverem 2+ triagens finalizadas."
              : "Nenhum paciente corresponde à busca."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">WhatsApp</th>
                  <th className="px-3 py-2">Visitas</th>
                  <th className="px-3 py-2">Última visita</th>
                  <th className="px-3 py-2">Última especialidade</th>
                  <th className="px-3 py-2">Última queixa</th>
                  <th className="px-3 py-2">Urgência</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => <Row key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ p }: { p: PatientProfileSummary }) {
  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="px-3 py-2 font-medium">{p.name}</td>
      <td className="px-3 py-2 tabular-nums text-muted-foreground">{p.whatsapp}</td>
      <td className="px-3 py-2"><Badge variant="secondary">{p.total_visits}</Badge></td>
      <td className="px-3 py-2 text-muted-foreground">{relativeTime(p.last_seen_at)}</td>
      <td className="px-3 py-2">{p.last_specialty || "—"}</td>
      <td className="max-w-[260px] truncate px-3 py-2 text-muted-foreground" title={p.last_complaint || ""}>
        {truncate(p.last_complaint || "—", 80)}
      </td>
      <td className="px-3 py-2">{classBadge(p.last_classification)}</td>
      <td className="px-3 py-2 text-right">
        <Link
          to="/admin/pacientes/$id"
          params={{ id: p.id }}
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver histórico
        </Link>
      </td>
    </tr>
  );
}

export function classBadge(c?: "low" | "medium" | "high" | null) {
  if (!c) return <span className="text-muted-foreground">—</span>;
  const cls =
    c === "high" ? "bg-destructive text-destructive-foreground"
    : c === "medium" ? "bg-yellow-500 text-white"
    : "bg-emerald-600 text-white";
  const label = c === "high" ? "Alta" : c === "medium" ? "Média" : "Baixa";
  return <span className={"inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold " + cls}>{label}</span>;
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!t) return "—";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} dia${d === 1 ? "" : "s"}`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `há ${mo} mês${mo === 1 ? "" : "es"}`;
  const y = Math.round(mo / 12);
  return `há ${y} ano${y === 1 ? "" : "s"}`;
}