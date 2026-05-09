import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, Calendar as CalendarIcon, Check, CheckCircle2, Loader2,
  MessageSquare, Send, Share2, ShieldCheck, Sparkles, Star,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/site-header";
import {
  triageApi, clinicsApi,
  type TriageSession, type Clinic, type AppointmentSlot, type SuggestedBooking,
  type AttendanceType,
} from "@/lib/api";
import { maskWhatsapp } from "@/lib/patient-session";
import { clearPatientHint } from "@/lib/patient-hint";
import { cn } from "@/lib/utils";

const GREETING =
  "Olá! Sou o assistente de triagem da STOMNI. Conte-me, com suas palavras, o que você está sentindo. Pode descrever sintomas, dor ou dúvidas — vou te ajudar a encontrar o melhor caminho.";

type Step = "chat" | "schedule";

export interface TriageChatProps {
  sessionId?: string;
}

export function TriageChat({ sessionId }: TriageChatProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<TriageSession | null>(null);
  const [loading, setLoading] = useState<boolean>(!!sessionId);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<Step>("chat");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resume flow
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setNotFound(false);
    triageApi.getSession(sessionId)
      .then((s) => setSession(s))
      .catch((e: any) => {
        if (e?.response?.status === 404) setNotFound(true);
        else toast.error("Falha ao carregar sessão");
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.messages.length, sending]);

  const messages = useMemo(() => {
    if (session) return session.messages;
    return [{ role: "assistant" as const, text: GREETING, ts: new Date().toISOString() }];
  }, [session]);

  const inputDisabled =
    sending ||
    loading ||
    notFound ||
    session?.state === "assessment" ||
    session?.state === "confirmed";

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      if (!session) {
        navigate({ to: "/triagem" });
        return;
      } else {
        const s = await triageApi.sendMessage(session.id, text);
        setSession(s);
      }
    } catch {
      toast.error("Não foi possível enviar a mensagem. Tente novamente.");
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const onShare = async () => {
    if (!session?.share_url) return;
    try {
      await navigator.clipboard.writeText(session.share_url);
      toast.success("Link copiado! Use-o para continuar a triagem em outro dispositivo.");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Sessão não encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta triagem pode ter expirado ou o link está incorreto.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/triagem" })}>
            Iniciar nova triagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Triagem conversacional</p>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Como podemos ajudar você hoje?</h1>
          </div>
          {session && (
            <Button variant="outline" size="sm" onClick={onShare} title="Copiar link da sessão">
              <Share2 className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Compartilhar</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            data-testid="chat-not-me-btn"
            onClick={() => {
              clearPatientHint();
              toast.success("Identificação removida.");
              navigate({ to: "/triagem" });
            }}
            title="Limpar identificação salva neste dispositivo"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Não sou eu
          </Button>
        </header>

        {loading ? (
          <Card className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-2/3" />
          </Card>
        ) : step === "chat" ? (
          <>
            <Card className="flex h-[60vh] flex-col overflow-hidden md:h-[55vh]">
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} text={m.text} />
                ))}
                {sending && <Bubble role="assistant" typing />}
              </div>
              <div className="border-t bg-card p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={1}
                    disabled={inputDisabled}
                    placeholder={
                      session?.state === "confirmed"
                        ? "Triagem finalizada"
                        : session?.state === "assessment"
                        ? "Avaliação concluída — siga para o agendamento"
                        : "Descreva o que você está sentindo..."
                    }
                    className="min-h-[44px] max-h-32 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  />
                  <Button type="submit" size="icon" disabled={inputDisabled || !input.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </Card>

            {session?.state === "assessment" && (
              <AssessmentCard session={session} onContinue={() => setStep("schedule")} />
            )}

            {session?.state === "assessment" && session.suggested_booking && (
              <SuggestedBookingCard
                booking={session.suggested_booking}
                onConfirm={() => setShowConfirmDialog(true)}
                onChooseOther={() => setStep("schedule")}
              />
            )}

            {session && session.suggested_booking && (
              <ConfirmSuggestionDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                session={session}
                onConfirmed={(s: TriageSession) => {
                  setSession(s);
                  setShowConfirmDialog(false);
                }}
              />
            )}

            {session?.state === "confirmed" && (
              <Card className="mt-4 p-5 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-3 text-lg font-bold">Triagem finalizada</h2>
                {session.linked_triage_id && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Protocolo:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {session.linked_triage_id}
                    </span>
                  </p>
                )}
                <Button className="mt-5" variant="outline" onClick={() => navigate({ to: "/" })}>
                  Voltar ao início
                </Button>
              </Card>
            )}
          </>
        ) : (
          <ScheduleStep
            session={session!}
            onBack={() => setStep("chat")}
            onConfirmed={(s) => { setSession(s); setStep("chat"); }}
          />
        )}
      </div>
    </div>
  );
}

function SuggestedBookingCard({
  booking, onConfirm, onChooseOther,
}: { booking: SuggestedBooking; onConfirm: () => void; onChooseOther: () => void }) {
  return (
    <Card className="mt-4 border-2 border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-primary" />
          Encaminhamento sugerido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Profissional</span>
            <p className="font-medium">
              {booking.professional_title} {booking.professional_name}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Especialidade</span>
            <p className="font-medium">{booking.specialty_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Data e horário</span>
            <p className="font-medium">
              {format(parseISO(booking.date), "dd/MM/yyyy")} às {booking.time}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Unidade</span>
            <p className="font-medium">{booking.clinic_name}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button className="flex-1" onClick={onConfirm}>
            <Check className="mr-1 h-4 w-4" /> Confirmar este horário
          </Button>
          <Button variant="outline" className="flex-1" onClick={onChooseOther}>
            <CalendarIcon className="mr-1 h-4 w-4" /> Escolher outra data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmSuggestionDialog({
  open, onOpenChange, session, onConfirmed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: TriageSession;
  onConfirmed: (s: TriageSession) => void;
}) {
  const [name, setName] = useState(session.patient_hint?.full_name ?? "");
  const [phone, setPhone] = useState(session.patient_hint?.whatsapp ?? "");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ protocol: string; classification: string; message: string } | null>(null);

  const valid =
    name.trim().length >= 3 &&
    /^\(\d{2}\) \d{5}-\d{4}$/.test(phone) &&
    consent;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await triageApi.confirmSuggestion(session.id, {
        full_name: name.trim(),
        whatsapp: phone,
        clinic_id: session.suggested_booking?.clinic_id ?? "",
        consent: true,
        email: email.trim() || undefined,
      });
      setDone(res);
    } catch {
      toast.error("Não foi possível confirmar o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    if (done) {
      onConfirmed({ ...session, state: "confirmed", linked_triage_id: done.protocol });
    }
    setDone(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && done) finish();
        else onOpenChange(o);
      }}
    >
      <DialogContent>
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" /> Agendamento confirmado
              </DialogTitle>
              <DialogDescription>{done.message}</DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-3 text-center">
              <p className="text-xs uppercase text-muted-foreground">Protocolo</p>
              <p className="font-mono text-lg font-semibold">{done.protocol}</p>
            </div>
            <DialogFooter>
              <Button onClick={finish}>Concluir</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar agendamento</DialogTitle>
              <DialogDescription>
                Informe seus dados para confirmar o horário sugerido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cf-name">Nome completo</Label>
                <Input
                  id="cf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Silva"
                />
              </div>
              <div>
                <Label htmlFor="cf-phone">WhatsApp</Label>
                <Input
                  id="cf-phone"
                  value={phone}
                  onChange={(e) => setPhone(maskWhatsapp(e.target.value))}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                />
              </div>
              <div>
                <Label htmlFor="cf-email">Email (opcional)</Label>
                <Input
                  id="cf-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  data-testid="patient-email-input"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Se preenchido, enviaremos a confirmação do agendamento por email.
                </p>
              </div>
              <label className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />
                  Concordo com a Política de Privacidade e o tratamento dos meus dados
                  conforme a LGPD.
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={!valid || submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar agendamento
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Bubble({
  role, text, typing,
}: { role: "user" | "assistant"; text?: string; typing?: boolean }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          mine
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm",
        ].join(" ")}
      >
        {typing ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> digitando...
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{text}</span>
        )}
      </div>
    </div>
  );
}

function AssessmentCard({
  session, onContinue,
}: { session: TriageSession; onContinue: () => void }) {
  const score = session.urgency_score ?? 0;
  const level: "low" | "medium" | "high" =
    score >= 8 ? "high" : score >= 4 ? "medium" : "low";
  const colorVar =
    level === "high" ? "var(--urgency-high)"
    : level === "medium" ? "var(--urgency-medium)"
    : "var(--urgency-low)";
  const label = level === "high" ? "Alta" : level === "medium" ? "Moderada" : "Baixa";

  return (
    <Card className="mt-4 p-5">
      {session.is_emergency && (
        <div
          className="mb-4 flex items-start gap-2 rounded-md p-3 text-sm text-white"
          style={{ background: "var(--urgency-high)" }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Possível emergência. Procure pronto-socorro odontológico imediatamente.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ background: colorVar }}
        >
          <Sparkles className="h-3 w-3" /> Urgência {label} ({score}/10)
        </span>
        {session.specialty && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-primary">
            {session.specialty}
          </span>
        )}
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Field label="Queixa principal" value={session.extracted.main_complaint} />
        <Field
          label="Intensidade da dor"
          value={
            session.extracted.pain_intensity != null
              ? `${session.extracted.pain_intensity}/10`
              : null
          }
        />
        <Field label="Duração" value={session.extracted.duration} />
        <Field
          label="Sintomas associados"
          value={
            session.extracted.associated_symptoms.length
              ? session.extracted.associated_symptoms.join(", ")
              : null
          }
        />
      </dl>

      <Button className="mt-5 w-full sm:w-auto" onClick={onContinue}>
        Continuar e agendar <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

const ATTENDANCE: { value: AttendanceType; label: string }[] = [
  { value: "consulta", label: "Consulta" },
  { value: "emergencia", label: "Emergência" },
  { value: "retorno", label: "Retorno" },
  { value: "remarcacao", label: "Remarcação" },
  { value: "outros", label: "Outros" },
];

function ScheduleStep({
  session, onBack, onConfirmed,
}: {
  session: TriageSession;
  onBack: () => void;
  onConfirmed: (s: TriageSession) => void;
}) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [name, setName] = useState(session.patient_hint?.full_name ?? "");
  const [phone, setPhone] = useState(session.patient_hint?.whatsapp ?? "");
  const [email, setEmail] = useState("");
  const [clinicId, setClinicId] = useState(
    session.suggested_booking?.clinic_id ?? session.patient_hint?.clinic_id ?? "",
  );
  const [consent, setConsent] = useState(false);
  const [type, setType] = useState<AttendanceType>(session.is_emergency ? "emergencia" : "consulta");
  const [date, setDate] = useState<Date | undefined>(
    session.suggested_booking?.date ? parseISO(session.suggested_booking.date) : undefined,
  );
  const [slots, setSlots] = useState<AppointmentSlot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ protocol: string; classification: string; message: string } | null>(null);

  useEffect(() => { clinicsApi.list().then(setClinics).catch(() => {}); }, []);
  useEffect(() => {
    if (!date) { setSlots(null); setTime(""); return; }
    setLoadingSlots(true);
    setTime("");
    triageApi.availability(format(date, "yyyy-MM-dd"))
      .then(setSlots).finally(() => setLoadingSlots(false));
  }, [date]);

  const valid =
    name.trim().length >= 3 &&
    /^\(\d{2}\) \d{5}-\d{4}$/.test(phone) &&
    clinicId &&
    consent &&
    date &&
    time;

  const submit = async () => {
    if (!valid || !date) return;
    setSubmitting(true);
    try {
      const res = await triageApi.finalize(session.id, {
        patient: {
          full_name: name.trim(),
          whatsapp: phone,
          clinic_id: clinicId,
          consent: true,
          email: email.trim() || undefined,
        },
        attendance_type: type,
        date: format(date, "yyyy-MM-dd"),
        time,
      });
      setConfirmed(res);
    } catch {
      toast.error("Não foi possível confirmar o agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-lg font-bold">Agendar atendimento</h2>
        <p className="text-sm text-muted-foreground">
          Confirme seus dados para finalizar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="n">Nome completo</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" />
        </div>
        <div>
          <Label htmlFor="w">WhatsApp</Label>
          <Input
            id="w"
            value={phone}
            onChange={(e) => setPhone(maskWhatsapp(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="em">Email (opcional)</Label>
          <Input
            id="em"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            data-testid="patient-email-input"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Se preenchido, enviaremos a confirmação do agendamento por email.
          </p>
        </div>
        <div>
          <Label>Clínica</Label>
          <Select value={clinicId} onValueChange={setClinicId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de atendimento</Label>
          <Select value={type} onValueChange={(v) => setType(v as AttendanceType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ATTENDANCE.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <div>
          <Label className="mb-2 inline-flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" /> Data
          </Label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={ptBR}
            disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
            className="pointer-events-auto rounded-md border"
          />
        </div>
        <div>
          <Label className="mb-2 block">Horários disponíveis</Label>
          {!date && <p className="text-sm text-muted-foreground">Selecione uma data.</p>}
          {date && loadingSlots && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          )}
          {date && !loadingSlots && slots && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => {
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
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-accent",
                    ].filter(Boolean).join(" ")}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span className="flex-1">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />
          Concordo com o tratamento dos meus dados conforme a LGPD para fins de
          triagem e agendamento.
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onBack}>Voltar ao chat</Button>
        <Button onClick={submit} disabled={!valid || submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar agendamento
        </Button>
      </div>

      <Dialog open={!!confirmed} onOpenChange={(o) => { if (!o && confirmed) onConfirmed({ ...session, state: "confirmed", linked_triage_id: confirmed.protocol }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" /> Agendamento confirmado
            </DialogTitle>
            <DialogDescription>
              {confirmed?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted p-3 text-center">
            <p className="text-xs uppercase text-muted-foreground">Protocolo</p>
            <p className="font-mono text-lg font-semibold">{confirmed?.protocol}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => confirmed && onConfirmed({ ...session, state: "confirmed", linked_triage_id: confirmed.protocol })}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}