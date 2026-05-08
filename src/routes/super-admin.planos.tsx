import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { RequireAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { superAdminPlansApi, type AdminPlan } from "@/lib/api";

export const Route = createFileRoute("/super-admin/planos")({
  head: () => ({ meta: [{ title: "Planos — Super Admin STOMNI" }] }),
  component: () => (
    <RequireAuth roles={["super_admin"]}>
      <PlansPage />
    </RequireAuth>
  ),
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

function blankPlan(): AdminPlan {
  return {
    id: "",
    name: "",
    amount: 0,
    currency: "brl",
    description: "",
    max_triages_per_month: 100,
    max_units: 1,
    is_active: true,
    is_public: true,
    sort_order: 99,
  };
}

function PlansPage() {
  const qc = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);

  const plansQ = useQuery({
    queryKey: ["super-admin", "plans"],
    queryFn: () => superAdminPlansApi.list(),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => superAdminPlansApi.remove(id),
    onSuccess: () => {
      toast.success("Plano excluído");
      qc.invalidateQueries({ queryKey: ["super-admin", "plans"] });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409) {
        toast.error(typeof detail === "string" ? detail : "Plano em uso por tenants — desative em vez de excluir");
      } else {
        toast.error(detail ?? "Erro ao excluir plano");
      }
    },
  });

  const onDelete = (p: AdminPlan) => {
    if (!confirm(`Excluir o plano "${p.name}"?`)) return;
    removeM.mutate(p.id);
  };

  const plans = (plansQ.data ?? []).filter((p) => includeInactive || p.is_active);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gerenciar Planos</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Crie, edite e desative planos. Mudanças afetam novos cadastros — clientes existentes mantêm seus limites originais.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo plano
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeInactive}
            onCheckedChange={(v) => setIncludeInactive(v === true)}
          />
          <span className="text-muted-foreground">Incluir planos inativos</span>
        </label>

        <Card className="overflow-hidden">
          {plansQ.isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Triagens/mês</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <PlanRow key={p.id} plan={p} onEdit={() => setEditing(p)} onDelete={() => onDelete(p)} />
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Nenhum plano.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <PlanSheet
        open={creating}
        onOpenChange={(v) => setCreating(v)}
        plan={null}
      />
      <PlanSheet
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        plan={editing}
      />
    </div>
  );
}

function PlanRow({
  plan, onEdit, onDelete,
}: { plan: AdminPlan; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const updateM = useMutation({
    mutationFn: (patch: Partial<AdminPlan>) => superAdminPlansApi.update(plan.id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin", "plans"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao atualizar"),
  });
  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{plan.id}</TableCell>
      <TableCell className="font-medium">{plan.name}</TableCell>
      <TableCell>{plan.amount === 0 ? "Grátis" : fmtBRL(plan.amount)}</TableCell>
      <TableCell>{plan.max_triages_per_month === -1 ? "Ilimitadas" : plan.max_triages_per_month}</TableCell>
      <TableCell>{plan.max_units === -1 ? "Ilimitadas" : plan.max_units}</TableCell>
      <TableCell>
        <Switch
          checked={plan.is_active}
          onCheckedChange={(v) => updateM.mutate({ is_active: v })}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={plan.is_public}
          onCheckedChange={(v) => updateM.mutate({ is_public: v })}
        />
      </TableCell>
      <TableCell>{plan.sort_order}</TableCell>
      <TableCell className="text-right">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function PlanSheet({
  open, onOpenChange, plan,
}: { open: boolean; onOpenChange: (v: boolean) => void; plan: AdminPlan | null }) {
  const qc = useQueryClient();
  const isEdit = !!plan;
  const [form, setForm] = useState<AdminPlan>(plan ?? blankPlan());

  // reset when plan changes
  useStateOnPlanChange(plan, setForm);

  const saveM = useMutation({
    mutationFn: () =>
      isEdit
        ? superAdminPlansApi.update(plan!.id, form)
        : superAdminPlansApi.create(form),
    onSuccess: () => {
      toast.success(isEdit ? "Plano atualizado" : "Plano criado");
      qc.invalidateQueries({ queryKey: ["super-admin", "plans"] });
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro ao salvar plano"),
  });

  const update = <K extends keyof AdminPlan>(k: K, v: AdminPlan[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar plano" : "Novo plano"}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <Field label="ID (slug)">
            <Input value={form.id} onChange={(e) => update("id", e.target.value)} disabled={isEdit} placeholder="enterprise" />
          </Field>
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Descrição">
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (centavos)">
              <Input type="number" value={form.amount} onChange={(e) => update("amount", Number(e.target.value))} />
            </Field>
            <Field label="Moeda">
              <Input value={form.currency} onChange={(e) => update("currency", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Triagens/mês (-1 = ilimitado)">
              <Input type="number" value={form.max_triages_per_month} onChange={(e) => update("max_triages_per_month", Number(e.target.value))} />
            </Field>
            <Field label="Unidades (-1 = ilimitado)">
              <Input type="number" value={form.max_units} onChange={(e) => update("max_units", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="Ordem de exibição">
            <Input type="number" value={form.sort_order} onChange={(e) => update("sort_order", Number(e.target.value))} />
          </Field>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">Disponível para novos cadastros</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Público</p>
              <p className="text-xs text-muted-foreground">Aparece na página /precos</p>
            </div>
            <Switch checked={form.is_public} onCheckedChange={(v) => update("is_public", v)} />
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

// helper hook to reset form whenever the plan prop changes
import { useEffect } from "react";
function useStateOnPlanChange(
  plan: AdminPlan | null,
  setForm: (p: AdminPlan) => void,
) {
  useEffect(() => {
    setForm(plan ?? blankPlan());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);
}
