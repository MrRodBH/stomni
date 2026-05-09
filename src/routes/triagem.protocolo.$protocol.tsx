import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { triageApi, type ProtocolView } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, Calendar, Clock, MapPin, MessageSquare, Sparkles, Phone,
} from "lucide-react";

export const Route = createFileRoute("/triagem/protocolo/$protocol")({
  head: () => ({
    meta: [{ title: "Acompanhar protocolo — STOMNI" }],
  }),
  component: ProtocolPage,
});

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const CLASSIFICATION_LABEL: Record<string, string> = {
  low: "Baixa urgência",
  medium: "Média urgência",
  high: "Alta urgência",
};

function classificationStyles(c: string): string {
  if (c === "high") return "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300";
  if (c === "medium") return "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300";
  return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300";
}

function statusStyles(s: string): string {
  if (s === "cancelled") return "bg-muted text-muted-foreground";
  if (s === "completed") return "bg-primary/10 text-primary";
  return "bg-accent text-primary";
}

function formatDate(date: string): string {
  try {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return date;
  }
}

function ProtocolPage() {
  const { protocol } = Route.useParams();

  const { data, isLoading, isError, error, refetch } = useQuery<ProtocolView>({
    queryKey: ["protocol", protocol],
    queryFn: () => triageApi.getByProtocol(protocol),
    retry: (failureCount, err: any) => {
      const status = err?.response?.status;
      if (status === 404 || status === 400) return false;
      return failureCount < 2;
    },
  });

  const status = (error as any)?.response?.status;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:py-14">
        {isLoading && <LoadingState />}

        {isError && (status === 404 || status === 400) && (
          <NotFoundState protocol={protocol} />
        )}

        {isError && status !== 404 && status !== 400 && (
          <ErrorState onRetry={() => refetch()} />
        )}

        {data && <ProtocolContent data={data} />}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="mx-auto h-10 w-64" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function NotFoundState({ protocol }: { protocol: string }) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
        <AlertCircle className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Protocolo não encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não localizamos o protocolo <span className="font-mono">{protocol}</span>.
        Verifique o código ou inicie uma nova triagem.
      </p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Link to="/triagem">
          <Button>Iniciar nova triagem</Button>
        </Link>
        <Link to="/">
          <Button variant="outline">Voltar à home</Button>
        </Link>
      </div>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <h1 className="text-xl font-bold">Não foi possível carregar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ocorreu um erro ao buscar seu protocolo. Tente novamente.
      </p>
      <Button className="mt-6" onClick={onRetry}>Tentar de novo</Button>
    </Card>
  );
}

function ProtocolContent({ data }: { data: ProtocolView }) {
  const statusLabel = STATUS_LABEL[data.status] ?? data.status;
  const classLabel = CLASSIFICATION_LABEL[data.classification] ?? data.classification;

  return (
    <div className="space-y-5">
      <header className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Protocolo</p>
        <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight">{data.protocol}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge
            data-testid="protocol-page-classification-badge"
            variant="outline"
            className={"border " + classificationStyles(data.classification)}
          >
            {classLabel} · {data.urgency_score}/10
          </Badge>
          <Badge
            data-testid="protocol-page-status"
            className={statusStyles(data.status)}
          >
            {statusLabel}
          </Badge>
        </div>
      </header>

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-testid="protocol-page-clinic">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Clínica
            </p>
            <p className="mt-1 text-base font-semibold">{data.clinic_name ?? "—"}</p>
            {data.specialty && (
              <p className="mt-0.5 text-sm text-muted-foreground">{data.specialty}</p>
            )}
          </div>
          <div data-testid="protocol-page-datetime">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Data e horário
            </p>
            <p className="mt-1 text-base font-semibold capitalize">{formatDate(data.date)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-2xl font-bold tracking-tight text-primary">
              <Clock className="h-5 w-5" /> {data.time}
            </p>
          </div>
        </div>
      </Card>

      {data.main_complaint && (
        <Card className="p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> Sua queixa
          </p>
          <p
            data-testid="protocol-page-complaint"
            className="mt-2 text-sm text-foreground"
          >
            {data.main_complaint}
          </p>
        </Card>
      )}

      {data.ai_message && (
        <Card className="p-6">
          <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Mensagem do assistente
          </p>
          <p
            data-testid="protocol-page-ai-message"
            className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground"
          >
            {data.ai_message}
          </p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{data.patient.full_name}</span>
            </p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span className="font-mono">{data.patient.whatsapp_masked}</span>
            </p>
          </div>
          {data.status === "scheduled" && (
            <a
              href={`mailto:contato@stomni.com.br?subject=Cancelar%20${encodeURIComponent(data.protocol)}`}
            >
              <Button variant="outline" size="sm">Cancelar agendamento</Button>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}