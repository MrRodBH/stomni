import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import { tenantSettingsApi, type TenantSettings } from "@/lib/api";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Admin · Configurações — STOMNI" }] }),
  component: SettingsPage,
});

const PROMPT_LIMIT = 6000;

const TIMEZONES = [
  "America/Sao_Paulo", "America/Bahia", "America/Manaus", "America/Recife",
  "America/Fortaleza", "America/Belem", "UTC",
];

const PROMPT_TEMPLATES: { name: string; prompt: string }[] = [
  {
    name: "Mais formal",
    prompt:
      "Você é um assistente clínico-odontológico. Use linguagem formal, técnica quando apropriado, e mantenha tom respeitoso e profissional. Faça perguntas objetivas sobre sintomas, intensidade e duração. Nunca dê diagnósticos.",
  },
  {
    name: "Descontraído com emojis",
    prompt:
      "Você é um assistente acolhedor da clínica! 😊 Use linguagem leve, emojis com moderação e demonstre empatia. Faça perguntas claras, sem termos técnicos complexos. Lembre: nada de diagnósticos — só ajude a entender a situação.",
  },
  {
    name: "Foco em estética dental",
    prompt:
      "Você é um assistente de uma clínica especializada em estética dental. Além de coletar queixas clínicas, explore expectativas estéticas (sorriso, alinhamento, branqueamento). Tom acolhedor e consultivo. Sem diagnósticos.",
  },
];

function SettingsPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => tenantSettingsApi.get(),
  });

  const updateM = useMutation({
    mutationFn: (s: TenantSettings) => tenantSettingsApi.update(s),
    onSuccess: (data) => {
      qc.setQueryData(["tenant-settings"], data);
      toast.success("Configurações salvas.");
    },
    onError: () => toast.error("Falha ao salvar configurações."),
  });

  if (settingsQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const data = settingsQ.data ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize sua clínica, o assistente de triagem e relatórios.
        </p>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="ia">IA da Triagem</TabsTrigger>
          <TabsTrigger value="reports">Relatórios Semanais</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <GeneralTab initial={data} save={(s) => updateM.mutate(s)} pending={updateM.isPending} />
        </TabsContent>
        <TabsContent value="ia">
          <AiTab
            initial={data}
            save={(s) => updateM.mutate(s, {
              onSuccess: () => toast.success("Suas mudanças aparecerão na próxima triagem iniciada."),
            })}
            pending={updateM.isPending}
          />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab initial={data} save={(s) => updateM.mutate(s)} pending={updateM.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab({
  initial, save, pending,
}: { initial: TenantSettings; save: (s: TenantSettings) => void; pending: boolean }) {
  const [tz, setTz] = useState(initial.timezone ?? "America/Sao_Paulo");
  const [lang, setLang] = useState(initial.language ?? "pt-BR");
  const [logo, setLogo] = useState(initial.branding?.logo_url ?? "");
  const [color, setColor] = useState(initial.branding?.primary_color ?? "#3b82f6");

  useEffect(() => {
    setTz(initial.timezone ?? "America/Sao_Paulo");
    setLang(initial.language ?? "pt-BR");
    setLogo(initial.branding?.logo_url ?? "");
    setColor(initial.branding?.primary_color ?? "#3b82f6");
  }, [initial]);

  return (
    <Card className="mt-4 space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Timezone</Label>
          <Select value={tz} onValueChange={setTz}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Idioma</Label>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Branding</h3>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <Label htmlFor="logo">URL do logo</Label>
            <Input id="logo" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label htmlFor="color">Cor primária</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 cursor-pointer p-1"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <Button
          disabled={pending}
          onClick={() =>
            save({
              ...initial,
              timezone: tz,
              language: lang,
              branding: { logo_url: logo || null, primary_color: color || null },
            })
          }
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </Card>
  );
}

function AiTab({
  initial, save, pending,
}: { initial: TenantSettings; save: (s: TenantSettings) => void; pending: boolean }) {
  const [prompt, setPrompt] = useState(initial.triage_prompt_override ?? "");

  useEffect(() => {
    setPrompt(initial.triage_prompt_override ?? "");
  }, [initial]);

  const overLimit = prompt.length > PROMPT_LIMIT;

  return (
    <Card className="mt-4 space-y-5 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Sparkles className="h-4 w-4 text-primary" />
          Personalize o assistente virtual da sua clínica
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize o tom, perguntas e estilo. Ele continuará seguindo as regras de
          segurança (sem diagnósticos, alerta de emergência), com a personalidade
          da sua clínica.
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="prompt">Prompt customizado</Label>
          <span className={"text-xs " + (overLimit ? "text-destructive" : "text-muted-foreground")}>
            {prompt.length} / {PROMPT_LIMIT}
          </span>
        </div>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="font-mono text-xs"
          placeholder="Vazio = usa o prompt padrão da STOMNI."
        />
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm">
            <ChevronDown className="mr-2 h-4 w-4" />
            Ver exemplos de prompts customizados
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {PROMPT_TEMPLATES.map((t) => (
            <div key={t.name} className="rounded-md border bg-muted/30 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold">{t.name}</p>
                <Button size="sm" variant="ghost" onClick={() => setPrompt(t.prompt)}>
                  Usar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t.prompt}</p>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-2">
        <Button
          disabled={pending || overLimit}
          onClick={() => save({ ...initial, triage_prompt_override: prompt || null })}
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        <Button variant="outline" onClick={() => setPrompt("")}>
          Restaurar padrão
        </Button>
      </div>
    </Card>
  );
}

function ReportsTab({
  initial, save, pending,
}: { initial: TenantSettings; save: (s: TenantSettings) => void; pending: boolean }) {
  const [enabled, setEnabled] = useState(initial.weekly_insights_enabled ?? false);
  const [email, setEmail] = useState(initial.weekly_insights_recipient ?? "");

  useEffect(() => {
    setEnabled(initial.weekly_insights_enabled ?? false);
    setEmail(initial.weekly_insights_recipient ?? "");
  }, [initial]);

  return (
    <Card className="mt-4 space-y-5 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Receber relatório semanal por email</p>
          <p className="text-xs text-muted-foreground">
            Toda segunda-feira você receberá resumo da semana com volume, mix e insights AI.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div>
        <Label htmlFor="recipient">Email destinatário</Label>
        <Input
          id="recipient"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="gestor@clinica.com"
          disabled={!enabled}
        />
      </div>

      <div>
        <Button
          disabled={pending}
          onClick={() =>
            save({
              ...initial,
              weekly_insights_enabled: enabled,
              weekly_insights_recipient: email || null,
            })
          }
        >
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </Card>
  );
}
