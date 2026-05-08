import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { superAdminReferralApi, type ReferralProgram } from "@/lib/api";

export const Route = createFileRoute("/super-admin/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações Globais — Super Admin" }] }),
  component: () => (
    <RequireAuth roles={["super_admin"]}>
      <ReferralProgramPage />
    </RequireAuth>
  ),
});

const DEFAULTS: ReferralProgram = {
  enabled: false,
  bonus_per_referral: 30,
  max_accumulated_bonus: 300,
  max_referrals_per_month: 10,
  min_plan_to_trigger: "basic",
  campaign_name: "Indique e ganhe",
  starts_at: null,
  ends_at: null,
};

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

function ReferralProgramPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ReferralProgram>(DEFAULTS);

  const q = useQuery({
    queryKey: ["super-admin", "referral-program"],
    queryFn: () => superAdminReferralApi.get(),
  });

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const saveM = useMutation({
    mutationFn: () => superAdminReferralApi.update(form),
    onSuccess: () => {
      toast.success("Programa salvo");
      qc.invalidateQueries({ queryKey: ["super-admin", "referral-program"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao salvar"),
  });

  const update = <K extends keyof ReferralProgram>(k: K, v: ReferralProgram[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const now = Date.now();
  const startsMs = form.starts_at ? new Date(form.starts_at).getTime() : null;
  const endsMs = form.ends_at ? new Date(form.ends_at).getTime() : null;
  const outOfWindow =
    form.enabled &&
    ((startsMs !== null && now < startsMs) || (endsMs !== null && now > endsMs));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programa de Indicação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle global do programa de indicações de toda a plataforma.
          </p>
        </div>

        {q.isLoading ? (
          <Card className="p-6 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </Card>
        ) : (
          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-semibold">Programa ativo</p>
                <p className="text-xs text-muted-foreground">
                  Quando desligado, nenhuma nova indicação gera crédito.
                </p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => update("enabled", v)} />
            </div>

            {outOfWindow && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Programa habilitado mas fora da janela — não está creditando atualmente.</p>
              </div>
            )}

            <Field label="Nome da campanha">
              <Input value={form.campaign_name} onChange={(e) => update("campaign_name", e.target.value)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bônus por indicação (triagens)">
                <Input
                  type="number"
                  value={form.bonus_per_referral}
                  onChange={(e) => update("bonus_per_referral", Number(e.target.value))}
                />
              </Field>
              <Field label="Acumulação máxima (teto)">
                <Input
                  type="number"
                  value={form.max_accumulated_bonus}
                  onChange={(e) => update("max_accumulated_bonus", Number(e.target.value))}
                />
              </Field>
              <Field label="Indicações máximas/mês por referrer">
                <Input
                  type="number"
                  value={form.max_referrals_per_month}
                  onChange={(e) => update("max_referrals_per_month", Number(e.target.value))}
                />
              </Field>
              <Field label="Plano mínimo para disparar">
                <Select
                  value={form.min_plan_to_trigger}
                  onValueChange={(v) => update("min_plan_to_trigger", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Início (opcional)">
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.starts_at)}
                  onChange={(e) => update("starts_at", fromLocalInput(e.target.value))}
                />
              </Field>
              <Field label="Fim (opcional)">
                <Input
                  type="datetime-local"
                  value={toLocalInput(form.ends_at)}
                  onChange={(e) => update("ends_at", fromLocalInput(e.target.value))}
                />
              </Field>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
              💡 <strong>Como funciona:</strong> Quando uma clínica se cadastra usando o link de indicação{" "}
              <strong>E</strong> completa o primeiro pagamento num plano <strong>{form.min_plan_to_trigger}</strong>{" "}
              ou superior, AMBAS recebem <strong>{form.bonus_per_referral}</strong> triagens bônus, que são consumidas
              após o limite mensal regular.
            </div>

            <div className="flex justify-end">
              <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
                {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configuração
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
