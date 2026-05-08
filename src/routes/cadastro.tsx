import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { billingApi, type Plan } from "@/lib/api";

type PlanId = "trial" | "basic" | "pro";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): { plan: PlanId } => {
    const p = (search.plan as string) ?? "trial";
    return { plan: (["trial", "basic", "pro"].includes(p) ? p : "trial") as PlanId };
  },
  head: () => ({
    meta: [
      { title: "Criar conta — STOMNI" },
      { name: "description", content: "Crie sua conta STOMNI e ative seu painel." },
    ],
  }),
  component: SignupPage,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

function SignupPage() {
  const { plan: planId } = Route.useSearch();
  const navigate = useNavigate();

  const plansQ = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingApi.listPlans(),
    staleTime: 5 * 60_000,
  });
  const selected: Plan | undefined = plansQ.data?.plans.find((p) => p.id === planId);

  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);

  const signup = useMutation({
    mutationFn: () =>
      billingApi.signup({
        clinic_name: clinicName.trim(),
        contact_email: email.trim(),
        admin_password: password,
        plan_id: planId,
        origin_url: window.location.origin,
      }),
    onSuccess: (resp) => {
      if (resp.next_action === "checkout" && resp.checkout_url) {
        toast.success("Redirecionando para o pagamento…");
        window.location.href = resp.checkout_url;
      } else {
        toast.success("Conta criada! Faça login para começar.");
        navigate({ to: "/login" });
      }
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 409) toast.error("Email já cadastrado");
      else if (status === 503) toast.error("Pagamentos indisponíveis no momento");
      else toast.error(err?.response?.data?.message ?? "Erro ao criar conta");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicName.trim()) return toast.error("Informe o nome da clínica");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Email inválido");
    if (password.length < 8) return toast.error("Senha precisa ter ao menos 8 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    if (!terms) return toast.error("Você precisa aceitar os termos");
    signup.mutate();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10 md:py-14">
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <Card className="p-6 md:p-8">
            <h1 className="text-2xl font-bold tracking-tight">Criar sua conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Em poucos passos sua clínica começa a usar o STOMNI.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="clinic">Nome da clínica</Label>
                <Input id="clinic" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Clínica Sorriso" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email do administrador</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@clinica.com" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pwd">Senha</Label>
                  <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pwd2">Confirmar senha</Label>
                  <Input id="pwd2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
                <span className="text-muted-foreground">
                  Aceito os termos de uso e a política de privacidade do STOMNI.
                </span>
              </label>
              <Button type="submit" className="w-full" disabled={signup.isPending}>
                {signup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {planId === "trial" ? "Começar grátis" : "Continuar para pagamento"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Já tem conta? <Link to="/login" className="text-primary underline-offset-2 hover:underline">Entrar</Link>
              </p>
            </form>
          </Card>

          <aside>
            <Card className="sticky top-24 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano selecionado</p>
              {selected ? (
                <>
                  <h2 className="mt-1 text-xl font-bold">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
                  <p className="mt-4 text-3xl font-bold">
                    {selected.amount === 0 ? "Grátis" : fmtBRL(selected.amount)}
                    {selected.amount > 0 && <span className="ml-1 text-sm font-normal text-muted-foreground">/mês</span>}
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    <li>• {selected.max_triages_per_month === -1 ? "Triagens ilimitadas" : `${selected.max_triages_per_month.toLocaleString("pt-BR")} triagens/mês`}</li>
                    <li>• {selected.max_units === -1 ? "Unidades ilimitadas" : `${selected.max_units} unidade(s)`}</li>
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
              )}
              <Link to="/precos" className="mt-4 block text-center text-xs text-primary underline-offset-2 hover:underline">
                Trocar plano
              </Link>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}