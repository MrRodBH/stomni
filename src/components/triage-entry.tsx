import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader } from "@/components/site-header";
import { triageApi } from "@/lib/api";
import { clearPatientHint } from "@/lib/patient-hint";
import { maskWhatsapp } from "@/lib/patient-session";

const INITIAL_FORM = { full_name: "", whatsapp: "", consent: false };

export function TriageEntry() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Privacy: always start blank and clear any stale stored data on entry/exit.
  useEffect(() => {
    clearPatientHint();
    setForm(INITIAL_FORM);
    return () => {
      clearPatientHint();
      setForm(INITIAL_FORM);
    };
  }, []);

  const isValid =
    form.full_name.trim().length >= 2 &&
    form.whatsapp.replace(/\D/g, "").length >= 8 &&
    form.consent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const fullName = form.full_name.trim();
      const whatsapp = form.whatsapp.trim();
      const session = await triageApi.createSession({
        full_name: fullName,
        whatsapp,
        consent: true,
      });
      navigate({
        to: "/triagem/$sessionId" as any,
        params: { sessionId: session.id } as any,
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || "Erro ao iniciar triagem. Tente novamente.";
      toast.error(typeof detail === "string" ? detail : "Erro ao iniciar triagem.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Vamos começar sua triagem
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha seus dados para que a equipe possa te atender de forma personalizada.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo *</Label>
            <Input
              id="full_name"
              data-testid="triage-form-fullname"
              placeholder="Como você se chama?"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              minLength={2}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp *</Label>
            <Input
              id="whatsapp"
              data-testid="triage-form-whatsapp"
              placeholder="(11) 99999-9999"
              inputMode="tel"
              value={form.whatsapp}
              onChange={(e) =>
                setForm({ ...form, whatsapp: maskWhatsapp(e.target.value) })
              }
              required
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-accent/40 p-3 text-sm">
            <Checkbox
              data-testid="triage-form-consent"
              checked={form.consent}
              onCheckedChange={(c) => setForm({ ...form, consent: c === true })}
              className="mt-0.5"
            />
            <span className="flex-1 text-foreground">
              <ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />
              Concordo com o uso dos meus dados para tratamento das informações
              inerentes à clínica, conforme a LGPD.
            </span>
          </label>

          <Button
            type="submit"
            data-testid="triage-form-submit"
            disabled={!isValid || submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Iniciar triagem <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}