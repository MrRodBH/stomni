import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Check, FileUp, Loader2, Star, Trash2, X,
} from "lucide-react";
import {
  triageApi,
  uploadsApi,
  type AppointmentSlot,
  type AttendanceType,
  type TriageProcessResponse,
} from "@/lib/api";
import { loadPatient, maskName } from "@/lib/patient-session";
import { toast } from "sonner";

export const Route = createFileRoute("/triagem")({
  head: () => ({
    meta: [
      { title: "Triagem e Agendamento — STOMNI" },
      { name: "description", content: "Faça sua triagem e agende seu atendimento." },
    ],
  }),
  component: TriagePage,
});

const ATTENDANCE: { value: AttendanceType; label: string }[] = [
  { value: "consulta", label: "Consultas" },
  { value: "emergencia", label: "Emergências" },
  { value: "retorno", label: "Retorno" },
  { value: "remarcacao", label: "Remarcação" },
  { value: "cancelamento", label: "Cancelamentos" },
  { value: "outros", label: "Outros" },
];

interface UploadFile {
  id: string;
  file: File;
  progress: number; // 0..100
  status: "uploading" | "done" | "error";
  file_id?: string;
  object_key?: string;
  content_type: string;
  errorMessage?: string;
  abort?: AbortController;
}

type Step = "form" | "submitting" | "result" | "nps";

function TriagePage() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<ReturnType<typeof loadPatient>>(null);
  useEffect(() => { setPatient(loadPatient()); }, []);
  const [type, setType] = useState<AttendanceType | "">("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [drag, setDrag] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<AppointmentSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<TriageProcessResponse | null>(null);
  const [nps, setNps] = useState(0);

  useEffect(() => {
    if (!patient) {
      toast.message("Preencha seus dados primeiro");
      navigate({ to: "/" });
    }
  }, [patient, navigate]);

  useEffect(() => {
    if (!date) { setSlots(null); setTime(""); return; }
    const iso = format(date, "yyyy-MM-dd");
    setLoadingSlots(true);
    setTime("");
    triageApi.availability(iso)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = ["application/pdf", "image/png", "image/jpeg"];
    const next: UploadFile[] = [];
    Array.from(list).forEach((f) => {
      if (!accepted.includes(f.type)) {
        toast.error(`${f.name}: formato não suportado`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: máximo 10MB`);
        return;
      }
      next.push({
        id: Math.random().toString(36).slice(2),
        file: f,
        progress: 0,
        status: "uploading",
        content_type: f.type,
      });
    });
    setFiles((prev) => [...prev, ...next]);
    next.forEach(startUpload);
  };

  const startUpload = async (uf: UploadFile) => {
    const ctrl = new AbortController();
    setFiles((prev) =>
      prev.map((x) => (x.id === uf.id ? { ...x, abort: ctrl, status: "uploading", progress: 0, errorMessage: undefined } : x)),
    );
    try {
      const signed = await uploadsApi.sign(uf.file);
      await uploadsApi.uploadWithProgress(
        signed,
        uf.file,
        (pct) =>
          setFiles((prev) => prev.map((x) => (x.id === uf.id ? { ...x, progress: pct } : x))),
        ctrl.signal,
      );
      const confirmed = await uploadsApi.confirm({
        object_key: signed.object_key,
        filename: uf.file.name,
        size: uf.file.size,
        content_type: uf.file.type,
      });
      setFiles((prev) =>
        prev.map((x) =>
          x.id === uf.id
            ? { ...x, status: "done", progress: 100, file_id: confirmed.file_id, object_key: confirmed.object_key }
            : x,
        ),
      );
    } catch (err: any) {
      if (err?.message === "aborted") return;
      toast.error(`Falha no envio de ${uf.file.name}. Tente novamente.`);
      setFiles((prev) =>
        prev.map((x) =>
          x.id === uf.id ? { ...x, status: "error", errorMessage: err?.message ?? "Erro" } : x,
        ),
      );
    }
  };

  const retryUpload = (id: string) => {
    const uf = files.find((f) => f.id === id);
    if (uf) startUpload(uf);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      target?.abort?.abort();
      return prev.filter((f) => f.id !== id);
    });
  };

  const canSubmit = useMemo(() => {
    const filesReady = files.every((f) => f.status === "done");
    return Boolean(type && date && time && patient && filesReady);
  }, [type, date, time, patient, files]);

  const submit = async () => {
    if (!canSubmit || !patient || !date) return;
    setStep("submitting");
    try {
      const res = await triageApi.process({
        patient,
        attendance_type: type as AttendanceType,
        date: format(date, "yyyy-MM-dd"),
        time,
        notes: notes.trim() || undefined,
        files: files
          .filter((f) => f.status === "done" && f.file_id)
          .map((f) => ({
            file_id: f.file_id!,
            name: f.file.name,
            size: f.file.size,
            content_type: f.content_type,
            object_key: f.object_key,
          })),
      });
      setResult(res);
      setStep("result");
    } catch {
      toast.error("Falha ao registrar triagem. Tente novamente.");
      setStep("form");
    }
  };

  const cancel = () => navigate({ to: "/" });

  const finishWithNps = () => {
    if (nps === 0) { toast.message("Selecione uma nota antes de enviar"); return; }
    toast.success(`Avaliação registrada: ${nps} estrela${nps>1?"s":""}`);
    setTimeout(() => navigate({ to: "/" }), 600);
  };

  if (!patient) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paciente</p>
          <h1 className="text-2xl font-bold tracking-tight">{maskName(patient.full_name)}</h1>
          <p className="text-sm text-muted-foreground">
            Triagem e Agendamento — preencha as informações abaixo.
          </p>
        </header>

        {step === "form" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Card className="p-5">
                <Label className="text-sm font-semibold">Tipo de atendimento</Label>
                <p className="text-xs text-muted-foreground">Selecione a categoria adequada.</p>
                <div className="mt-3 max-w-md">
                  <Select value={type} onValueChange={(v) => setType(v as AttendanceType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card className="p-5">
                <Label className="text-sm font-semibold">Anexar exames, receitas ou fotos</Label>
                <p className="text-xs text-muted-foreground">PDF, PNG ou JPEG · até 10MB cada.</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setDrag(false); onPickFiles(e.dataTransfer.files); }}
                  className={`mt-3 rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? "border-primary bg-accent/40" : "border-border"}`}
                >
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent">
                    <FileUp className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-3 text-sm">Arraste arquivos ou</p>
                  <label className="mt-2 inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    Selecionar arquivos
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => { onPickFiles(e.target.files); e.currentTarget.value = ""; }}
                    />
                  </label>
                </div>

                {files.length > 0 && (
                  <ul className="mt-4 space-y-2.5">
                    {files.map((f) => (
                      <li key={f.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{f.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(f.file.size/1024).toFixed(1)} KB
                              {f.status === "done"
                                ? " · enviado"
                                : f.status === "error"
                                ? " · falha no envio"
                                : ` · ${Math.round(f.progress)}%`}
                            </p>
                          </div>
                          {f.status === "error" && (
                            <button
                              onClick={() => retryUpload(f.id)}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              Tentar novamente
                            </button>
                          )}
                          <button
                            onClick={() => removeFile(f.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <Progress value={f.progress} className="mt-2 h-1.5" />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5">
                <Label htmlFor="notes" className="text-sm font-semibold">Observações (opcional)</Label>
                <p className="text-xs text-muted-foreground">Descreva sintomas, dúvidas ou contexto adicional.</p>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Ex.: dor de dente intensa há 2 dias, piora ao mastigar..."
                  className="mt-3"
                />
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-5">
                <Label className="text-sm font-semibold">Calendário</Label>
                <p className="text-xs text-muted-foreground">Escolha a data desejada.</p>
                <div className="mt-3">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={ptBR}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                    className="pointer-events-auto"
                  />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                    Horários disponíveis
                  </p>
                  {!date && <p className="text-sm text-muted-foreground">Selecione uma data.</p>}
                  {date && loadingSlots && (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <Skeleton key={i} className="h-9" />
                      ))}
                    </div>
                  )}
                  {date && !loadingSlots && slots && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const isUrgent = s.urgency === "high" || s.urgency === "medium";
                          const selected = time === s.time;
                          return (
                            <button
                              key={s.time}
                              type="button"
                              disabled={!s.available}
                              onClick={() => setTime(s.time)}
                              className={[
                                "rounded-md border px-2 py-2 text-xs font-medium transition",
                                !s.available && "opacity-40 cursor-not-allowed",
                                selected && "ring-2 ring-primary",
                                isUrgent
                                  ? "border-transparent text-white"
                                  : "border-border bg-card hover:bg-accent",
                              ].filter(Boolean).join(" ")}
                              style={
                                isUrgent
                                  ? { backgroundColor: s.urgency === "high" ? "var(--urgency-high)" : "var(--urgency-medium)" }
                                  : undefined
                              }
                              title={isUrgent ? "Horário de urgência" : undefined}
                            >
                              {s.time}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--urgency-high)" }} />
                          urgência alta
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--urgency-medium)" }} />
                          urgência moderada
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              <div className="flex flex-col gap-2">
                <Button size="lg" disabled={!canSubmit} onClick={submit}>
                  <Check className="mr-2 h-4 w-4" /> Confirmar Triagem
                </Button>
                <Button size="lg" variant="outline" onClick={cancel}>
                  <X className="mr-2 h-4 w-4" /> Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "submitting" && (
          <Card className="grid place-items-center gap-3 p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando triagem com nossa IA clínica...</p>
            <div className="mt-4 w-full max-w-md space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        )}

        {step === "result" && result && (
          <Card className="p-8 text-center">
            <div
              className="mx-auto grid h-14 w-14 place-items-center rounded-full"
              style={{
                background:
                  result.classification === "high"
                    ? "var(--urgency-high)"
                    : result.classification === "medium"
                    ? "var(--urgency-medium)"
                    : "var(--urgency-low)",
              }}
            >
              {result.classification === "high"
                ? <AlertTriangle className="h-6 w-6 text-white" />
                : <Check className="h-6 w-6 text-white" />}
            </div>
            <h2 className="mt-4 text-xl font-bold">Triagem confirmada</h2>
            <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
            <p className="mt-4 inline-block rounded-md bg-muted px-3 py-1 text-sm">
              Protocolo <span className="font-mono font-semibold">{result.protocol}</span>
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => setStep("nps")}>Avaliar atendimento</Button>
              <Button variant="outline" onClick={cancel}>Voltar ao início</Button>
            </div>
          </Card>
        )}

        {step === "nps" && (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-bold">Como foi seu atendimento?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sua avaliação ajuda a melhorar o serviço.</p>
            <div className="mt-6 flex justify-center gap-2">
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNps(n)}
                  aria-label={`${n} estrela${n>1?"s":""}`}
                  className="rounded-md p-1 transition hover:scale-110"
                >
                  <Star
                    className={`h-9 w-9 ${n <= nps ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={finishWithNps}>Enviar avaliação</Button>
              <Button variant="outline" onClick={cancel}>Pular</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
