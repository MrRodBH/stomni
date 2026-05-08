import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Database, Download, FileText, Loader2, Trash2, UploadCloud,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeApi, type KnowledgeDoc } from "@/lib/api";

export const Route = createFileRoute("/admin/conhecimento")({
  head: () => ({ meta: [{ title: "Admin · Base de Conhecimento — STOMNI" }] }),
  component: KnowledgePage,
});

const ACCEPT = ".pdf,.md,.markdown,.txt";
const MAX_BYTES = 10 * 1024 * 1024;

function KnowledgePage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const docsQ = useQuery({
    queryKey: ["kb", "list"],
    queryFn: () => knowledgeApi.list(),
  });
  const statsQ = useQuery({
    queryKey: ["kb", "stats"],
    queryFn: () => knowledgeApi.stats(),
  });

  const uploadM = useMutation({
    mutationFn: (file: File) => knowledgeApi.upload(file),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["kb"] });
      if (doc.indexed_status === "empty" || doc.status === "empty") {
        toast.warning("Arquivo enviado mas sem texto extraível — verifique se o PDF não é escaneado.");
      } else {
        toast.success(`Documento indexado: ${doc.chunks_indexed} chunks adicionados.`);
      }
    },
    onError: () => toast.error("Falha ao enviar documento."),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["kb"] });
      toast.success(`Documento excluído (${res.chunks_removed} chunks removidos).`);
    },
    onError: () => toast.error("Falha ao excluir documento."),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: máximo 10MB`);
        return;
      }
      uploadM.mutate(f);
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Base de Conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Carregue PDFs, Markdown ou textos com protocolos clínicos. A IA usará
          esses documentos para fundamentar as triagens.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Documentos" value={statsQ.data?.total_documents} />
        <StatCard label="Chunks indexados" value={statsQ.data?.total_chunks} />
        <StatCard label="Coleção" value={statsQ.data?.collection} mono />
      </section>

      <Card
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed p-8 text-center transition ${drag ? "border-primary bg-accent/40" : "border-border"}`}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent">
          {uploadM.isPending
            ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
            : <UploadCloud className="h-5 w-5 text-primary" />}
        </div>
        <p className="mt-3 font-medium">Arraste arquivos aqui</p>
        <p className="text-xs text-muted-foreground">PDF, Markdown ou TXT · até 10MB cada</p>
        <Button className="mt-3" onClick={() => inputRef.current?.click()} disabled={uploadM.isPending}>
          Selecionar arquivos
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-5 py-3 text-sm font-semibold">Documentos</div>
        {docsQ.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !docsQ.data?.length ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum documento enviado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Arquivo</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Chunks</th>
                  <th className="px-5 py-2.5">Tamanho</th>
                  <th className="px-5 py-2.5">Enviado</th>
                  <th className="px-5 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {docsQ.data.map((d) => <DocRow key={d.id} doc={d} onDelete={() => {
                  if (confirm(`Excluir ${d.filename}?`)) deleteM.mutate(d.id);
                }} />)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, mono }: { label: string; value?: number | string; mono?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-primary">
          <Database className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {value === undefined ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className={`text-2xl font-bold leading-tight ${mono ? "font-mono text-base" : ""}`}>
              {value}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DocRow({ doc, onDelete }: { doc: KnowledgeDoc; onDelete: () => void }) {
  const statusColors: Record<KnowledgeDoc["status"], string> = {
    indexed: "var(--urgency-low)",
    ready: "hsl(var(--primary, 220 80% 50%))",
    processing: "var(--urgency-medium)",
    empty: "hsl(0 0% 60%)",
    error: "var(--urgency-high)",
  };
  return (
    <tr className="border-t">
      <td className="px-5 py-3">
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{doc.filename}</span>
        </span>
      </td>
      <td className="px-5 py-3">
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: statusColors[doc.status] ?? "hsl(0 0% 60%)" }}
        >
          {doc.status}
        </span>
      </td>
      <td className="px-5 py-3 text-muted-foreground">{doc.chunks_indexed}</td>
      <td className="px-5 py-3 text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</td>
      <td className="px-5 py-3 text-muted-foreground">
        {new Date(doc.uploaded_at).toLocaleString("pt-BR")}
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          {doc.has_file && (
            <a
              href={knowledgeApi.downloadUrl(doc.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Baixar"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}