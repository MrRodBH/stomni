import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Gift, Copy, Share2, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { referralApi } from "@/lib/api";

export const Route = createFileRoute("/admin/indicacoes")({
  head: () => ({ meta: [{ title: "Indicações — STOMNI" }] }),
  component: ReferralPage,
});

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return null;
  }
}

function ReferralPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["referral", "me"],
    queryFn: () => referralApi.me(),
    staleTime: 30_000,
  });
  const [howOpen, setHowOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive">Erro ao carregar página de indicações.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  if (!data.program.active) {
    return (
      <Card className="p-8 text-center">
        <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Programa em breve</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Programa de indicação ainda não foi ativado pela administração da plataforma. Volte em breve!
        </p>
      </Card>
    );
  }

  const referralLink = data.referral_code
    ? `https://stomni.com.br/cadastro?ref=${data.referral_code}`
    : "";

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const share = async () => {
    if (!referralLink) return;
    const text = `Conhece a STOMNI? Use meu link: ${referralLink}`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "STOMNI",
          text,
          url: referralLink,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank");
  };

  const endsAt = fmtDate(data.program.ends_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Indicações</h1>
        <p className="text-sm text-muted-foreground">
          Indique outras clínicas e ganhe triagens bônus.
        </p>
      </div>

      <Card
        className="overflow-hidden border-primary/30 p-6 text-primary-foreground"
        style={{ background: "var(--gradient-hero, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7)))" }}
      >
        <div className="flex items-start gap-3">
          <Gift className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-bold">{data.program.campaign_name}</h2>
            <p className="mt-1 text-sm opacity-90">
              Indique uma clínica e ganhe <strong>+{data.program.bonus_per_referral} triagens bônus</strong>{" "}
              quando ela se tornar cliente.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-background/15 p-3 backdrop-blur">
          <p className="text-xs uppercase tracking-wider opacity-80">Seu link único</p>
          <p className="mt-1 break-all font-mono text-sm">
            {referralLink || "—"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={copyLink} variant="secondary" disabled={!referralLink}>
            <Copy className="mr-2 h-4 w-4" /> Copiar link
          </Button>
          <Button onClick={share} variant="outline" className="bg-background/10 text-primary-foreground hover:bg-background/20" disabled={!referralLink}>
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
        </div>

        {endsAt && (
          <p className="mt-3 text-xs opacity-80">Promoção válida até {endsAt}</p>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Indicações enviadas" value={data.stats.invited_total} />
        <StatCard label="Tornaram-se pagantes" value={data.stats.invited_paid} />
        <StatCard label="Bônus total ganho" value={data.stats.total_bonus_credited} />
        <StatCard label="Bônus disponível agora" value={data.bonus_triages} highlight />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Histórico de créditos</h3>
        {data.stats.recent_credits.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum crédito ainda.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {data.stats.recent_credits.map((c, i) => {
              const date = fmtDate((c.created_at as string) ?? (c.date as string));
              const name = (c.tenant_name as string) ?? "Clínica indicada";
              const anon = name.length > 20 ? name.slice(0, 18) + "…" : name;
              return (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{anon}</p>
                    {date && <p className="text-xs text-muted-foreground">{date}</p>}
                  </div>
                  <span className="font-semibold text-emerald-600">+{c.amount ?? 0}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <button
          type="button"
          onClick={() => setHowOpen((v) => !v)}
          className="flex w-full items-center justify-between text-sm font-semibold"
        >
          Como funciona
          {howOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {howOpen && (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Compartilhe seu link único com colegas dentistas</li>
            <li>
              Quando uma clínica se cadastrar pelo seu link e fizer o primeiro pagamento no plano{" "}
              <strong>{data.program.min_plan_to_trigger}</strong> ou superior, ambos recebem{" "}
              <strong>+{data.program.bonus_per_referral} triagens bônus</strong>
            </li>
            <li>As triagens bônus são consumidas automaticamente depois que você atingir o limite mensal</li>
            <li>
              Bônus acumula até o teto definido pela administração
            </li>
          </ol>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={"p-4 " + (highlight ? "border-primary/40 bg-primary/5" : "")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={"mt-1 text-2xl font-bold " + (highlight ? "text-primary" : "")}>{value}</p>
    </Card>
  );
}
