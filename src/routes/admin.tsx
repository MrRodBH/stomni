import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi, type KnowledgeDocument } from "@/lib/api";
import { UploadCloud, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — STOMNI" },
      { name: "description", content: "Gestão da base de conhecimento da clínica." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      const data = await adminApi.list();
      if (Array.isArray(data)) setDocs(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        try {
          const doc = await adminApi.upload(file);
          setDocs((d) => [doc, ...d]);
          toast.success(`${file.name} enviado`);
        } catch {
          // fallback local
          setDocs((d) => [{
            id: Math.random().toString(36).slice(2),
            filename: file.name,
            size: file.size,
            status: "processing",
            uploaded_at: new Date().toISOString(),
          }, ...d]);
          toast.message(`${file.name} adicionado (modo demo)`);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Base de conhecimento</h1>
        <p className="text-sm text-muted-foreground">Envie protocolos, FAQs e materiais de treinamento (PDF, TXT, vídeo).</p>

        <Card
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          className={`mt-6 border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-accent/50" : "border-border"}`}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
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
            accept=".pdf,.txt,.mp4,.mov"
            onChange={(e) => upload(e.target.files)}
          />
        </Card>

        <Card className="mt-6 overflow-hidden">
          <div className="border-b px-5 py-3 text-sm font-semibold">Documentos ativos</div>
          {docs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>
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
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        d.status === "ready" ? "bg-urgency-low text-white" :
                        d.status === "error" ? "bg-urgency-high text-white" :
                        "bg-urgency-medium text-white"
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(d.uploaded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}