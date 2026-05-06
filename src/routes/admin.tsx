import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminApi, analyticsApi,
  type AnalyticsMetrics, type KnowledgeDocument,
} from "@/lib/api";
import {
  Brain, Download, FileText, Loader2, Sparkles, Star, UploadCloud, Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — STOMNI" },
      { name: "description", content: "Gestão, métricas em tempo real e insights de IA." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);

  useEffect(() => { adminApi.list().then(setDocs).catch(() => {}); }, []);
  useEffect(() => { analyticsApi.metrics("day").then(setMetrics).catch(() => {}); }, []);

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const doc = await adminApi.upload(file);
        setDocs((d) => [doc, ...d]);
        toast.success(`${file.name} enviado`);
      }
    } finally {
      setUploading(false);
    }
  };

  const exportCsv = () => {
    if (!metrics) return;
    const rows = [
      ["tipo", "quantidade"],
      ...metrics.mix.map((m) => [m.label, String(m.value)]),
      [],
      ["serie", "valor"],
      ...metrics.volume_series.map((s) => [s.label, String(s.value)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `stomni-relatorio-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const exportPdf = () => {
    toast.message("Abrindo diálogo de impressão (Salvar como PDF)");
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Base de conhecimento, métricas em tempo real e análises da IA.
          </p>
        </header>

        {/* Estatísticas em tempo real */}
        <section className="grid gap-4 sm:grid-cols-3">
          <RealtimeKpi
            icon={Users}
            label="Atendimentos abertos"
            value={metrics?.open_now}
            sub={`${metrics?.in_progress ?? 0} em andamento`}
          />
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nota média</p>
            {!metrics ? (
              <Skeleton className="mt-2 h-8 w-24" />
            ) : (
              <div className="mt-1 flex items-center gap-3">
                <p className="text-3xl font-bold">{metrics.nps_avg.toFixed(1)}</p>
                <div className="flex">
                  {[1,2,3,4,5].map((n) => (
                    <Star
                      key={n}
                      className={`h-5 w-5 ${n <= Math.round(metrics.nps_avg) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Baseado nas últimas avaliações.</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Exportar relatórios</p>
            <p className="mt-1 text-sm text-muted-foreground">Período atual selecionado.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={!metrics}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={exportPdf}>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          </Card>
        </section>

        {/* Insights da IA */}
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Insights da IA</h2>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
              <Sparkles className="h-3 w-3" /> auto
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Principais motivos de contato e gargalos.</p>
          {!metrics ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {metrics.ai_insights.map((t, i) => (
                <li key={i} className="flex gap-2 rounded-md bg-muted/40 p-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground">{t}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Base de conhecimento */}
        <section>
          <h2 className="text-lg font-semibold">Base de conhecimento</h2>
          <p className="text-sm text-muted-foreground">Envie protocolos, FAQs e materiais de treinamento.</p>

          <Card
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
            className={`mt-4 border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-accent/40" : "border-border"}`}
          >
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent">
              {uploading
                ? <Loader2 className="h-6 w-6 animate-spin text-primary" />
                : <UploadCloud className="h-6 w-6 text-primary" />}
            </div>
            <p className="mt-4 font-medium">Arraste arquivos aqui</p>
            <p className="text-sm text-muted-foreground">ou</p>
            <Button className="mt-3" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Selecionar arquivos
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.txt,.md"
              onChange={(e) => { upload(e.target.files); e.currentTarget.value = ""; }}
            />
          </Card>

          <Card className="mt-6 overflow-hidden">
            <div className="border-b px-5 py-3 text-sm font-semibold">Documentos ativos</div>
            {docs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhum documento enviado ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5">Arquivo</th>
                    <th className="px-5 py-2.5">Tamanho</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {d.filename}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{(d.size / 1024).toFixed(1)} KB</td>
                      <td className="px-5 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs text-white"
                          style={{
                            backgroundColor:
                              d.status === "ready" ? "var(--urgency-low)" :
                              d.status === "error" ? "var(--urgency-high)" :
                              "var(--urgency-medium)",
                          }}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(d.uploaded_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function RealtimeKpi({
  icon: Icon, label, value, sub,
}: { icon: any; label: string; value?: number; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="mt-1 h-7 w-12" />
          ) : (
            <p className="text-3xl font-bold leading-tight">{value}</p>
          )}
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
