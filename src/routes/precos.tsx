import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { billingApi, type Plan } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Planos e Preços — STOMNI" },
      {
        name: "description",
        content:
          "Escolha o plano ideal para sua clínica e ative o STOMNI em minutos.",
      },
    ],
  }),
  component: PricingPage,
});

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v / 100);

function PricingPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => billingApi.listPlans(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 md:py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Planos para clínicas
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Comece grátis. Cresça quando precisar.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Triagem inteligente, painel completo e suporte. Sem fidelidade.
          </p>
        </div>

        {isLoading && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <Card className="mx-auto mt-10 max-w-md p-6 text-center">
            <p className="text-sm text-destructive">Erro ao carregar planos.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </Card>
        )}

        {data && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {data.plans.map((p) => (
              <PlanCard key={p.id} plan={p} highlighted={p.id === "pro"} />
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Pagamentos processados com segurança via Stripe. Cancele quando quiser.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({ plan, highlighted }: { plan: Plan; highlighted: boolean }) {
  const triagesLabel =
    plan.max_triages_per_month === -1
      ? "Triagens ilimitadas"
      : `${plan.max_triages_per_month.toLocaleString("pt-BR")} triagens/mês`;
  const unitsLabel =
    plan.max_units === -1
      ? "Unidades ilimitadas"
      : `${plan.max_units} ${plan.max_units === 1 ? "unidade" : "unidades"}`;

  return (
    <Card
      className={cn(
        "relative flex flex-col p-6 transition",
        highlighted && "border-primary shadow-lg ring-1 ring-primary/30",
      )}
    >
      {highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recomendado</Badge>
      )}
      <h3 className="text-lg font-bold">{plan.name}</h3>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
      <div className="mt-4">
        <span className="text-4xl font-bold">{plan.amount === 0 ? "Grátis" : fmtBRL(plan.amount)}</span>
        {plan.amount > 0 && (
          <span className="ml-1 text-sm text-muted-foreground">/mês</span>
        )}
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        <Feature text={triagesLabel} />
        <Feature text={unitsLabel} />
        <Feature text="Painel admin completo" />
        <Feature text="Insights de IA" />
      </ul>
      <div className="mt-6 flex-1" />
      <Link
        to="/cadastro"
        search={{ plan: plan.id }}
        className="mt-4"
      >
        <Button className="w-full" variant={highlighted ? "default" : "outline"}>
          Começar agora
        </Button>
      </Link>
    </Card>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </li>
  );
}