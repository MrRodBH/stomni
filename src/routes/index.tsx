import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck, Sparkles, Stethoscope, ArrowRight, FileSearch,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "STOMNI — Triagem Odontológica Inteligente" },
      {
        name: "description",
        content:
          "Converse com nosso assistente virtual e receba o encaminhamento certo da equipe clínica.",
      },
      { property: "og:title", content: "STOMNI — Triagem Odontológica Inteligente" },
      {
        property: "og:description",
        content: "Triagem conversacional com IA para clínicas odontológicas.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState("");

  const handleStart = () => {
    navigate({ to: "/triagem" });
  };

  const handleProtocolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = protocol.trim();
    if (!p) return;
    navigate({ to: "/triagem/protocolo/$protocol", params: { protocol: p } });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <section className="relative flex-1 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-14 md:py-24">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Atendimento seguro · LGPD
            </span>
            <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Triagem Odontológica{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-hero)" }}
              >
                Inteligente
              </span>{" "}
              em poucos minutos
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Converse com nosso assistente virtual e receba o encaminhamento
              certo da equipe clínica.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <Card
              className="group flex cursor-pointer flex-col justify-between gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-lg md:p-7"
              style={{ boxShadow: "var(--shadow-soft)" }}
              onClick={handleStart}
            >
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-bold">Iniciar Triagem</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Descreva o que você sente. Nosso assistente conduz uma
                  avaliação rápida e segura.
                </p>
              </div>
              <Button size="lg" className="w-full" onClick={(e) => { e.stopPropagation(); handleStart(); }}>
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>

            <Card
              className="group flex flex-col justify-between gap-4 p-6 transition hover:-translate-y-0.5 hover:shadow-lg md:p-7"
            >
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-primary">
                  <FileSearch className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-bold">Já tem protocolo?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informe seu protocolo para acompanhar o atendimento.
                </p>
              </div>
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleProtocolSubmit}>
                <Input
                  data-testid="card-protocol-input"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value.toUpperCase())}
                  placeholder="STM-A1B2C3"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="outline"
                  data-testid="card-protocol-submit"
                  disabled={!protocol.trim()}
                >
                  Acompanhar
                </Button>
              </form>
            </Card>
          </div>

          <ul className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Advantage
              icon={Sparkles}
              title="Classificação por IA"
              text="Urgência avaliada automaticamente para priorizar atendimentos."
            />
            <Advantage
              icon={Stethoscope}
              title="Encaminhamento direto"
              text="Equipe clínica recebe o caso já com a especialidade indicada."
            />
            <Advantage
              icon={ShieldCheck}
              title="Histórico LGPD"
              text="Dados protegidos, auditáveis e em conformidade com a LGPD."
            />
          </ul>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Advantage({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-5">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-primary">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </li>
  );
}
