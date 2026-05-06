import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck, Stethoscope, CalendarPlus } from "lucide-react";
import { clinicsApi, type Clinic } from "@/lib/api";
import { savePatient, maskWhatsapp } from "@/lib/patient-session";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STOMNI — Sistema de Triagem e Agendamento Online" },
      { name: "description", content: "Triagem e agendamento inteligente para clínicas." },
    ],
  }),
  component: HomePage,
});

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  whatsapp: z
    .string()
    .regex(/^\(\d{2}\) \d{5}-\d{4}$/, "WhatsApp no formato (00) 00000-0000"),
  clinic_id: z.string().min(1, "Selecione uma clínica"),
  consent: z.literal(true, { errorMap: () => ({ message: "É necessário aceitar a LGPD" }) }),
});

function HomePage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    clinicsApi.list().then(setClinics).catch(() => {});
  }, []);

  const submit = (target: "triagem" | "agendamento") => {
    const result = schema.safeParse({
      full_name: name,
      whatsapp: phone,
      clinic_id: clinicId,
      consent,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      toast.error("Verifique os campos do formulário");
      return;
    }
    setErrors({});
    savePatient({ ...result.data, consent: true });
    toast.success("Dados confirmados");
    navigate({ to: "/triagem", search: { mode: target } as any });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-12 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Atendimento seguro · LGPD
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Sistema de Triagem e <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>Agendamento Online</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Olá! Seja bem-vindo(a). Escolha uma opção abaixo para iniciarmos seu atendimento de forma rápida e segura.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <Bullet>Classificação automática de urgência por IA</Bullet>
              <Bullet>Encaminhamento direto à equipe clínica</Bullet>
              <Bullet>Histórico e protocolos seguros e auditáveis</Bullet>
            </ul>
          </div>

          <Card className="p-6 shadow-xl md:p-8" style={{ boxShadow: "var(--shadow-soft)" }}>
            <h2 className="text-lg font-semibold">Identificação do paciente</h2>
            <p className="text-sm text-muted-foreground">Preencha para iniciar o atendimento.</p>

            <form
              onSubmit={(e) => { e.preventDefault(); submit("triagem"); }}
              className="mt-5 space-y-4"
            >
              <Field label="Nome completo" error={errors.full_name} htmlFor="name">
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Ex.: Maria da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                />
              </Field>

              <Field label="WhatsApp" error={errors.whatsapp} htmlFor="phone">
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(maskWhatsapp(e.target.value))}
                />
              </Field>

              <Field label="Selecione a clínica mais próxima" error={errors.clinic_id} htmlFor="clinic">
                <Select value={clinicId} onValueChange={setClinicId}>
                  <SelectTrigger id="clinic">
                    <SelectValue placeholder="Escolha uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.city ? ` — ${c.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <label className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3 text-sm">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-muted-foreground">
                  Autorizo o uso dos meus dados pessoais para fins de triagem e agendamento clínico,
                  conforme a <a href="#" className="text-primary underline-offset-2 hover:underline">LGPD</a>.
                </span>
              </label>
              {errors.consent && (
                <p className="-mt-2 text-xs text-destructive">{errors.consent}</p>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Button type="submit" size="lg" className="w-full">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Fazer Triagem
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => submit("agendamento")}
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Agendar Consulta
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Field({
  label, htmlFor, error, children,
}: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}
