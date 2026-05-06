import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { MessageCircle, LayoutDashboard, FileUp, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Triagem clínica omnichannel
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl">
            Atendimento que <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>acolhe</span> e classifica.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            STOMNI conduz a triagem do paciente, prioriza casos urgentes e entrega contexto pronto para sua equipe clínica.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-lg" style={{ boxShadow: "var(--shadow-soft)" }}>
              <Link to="/triagem">Iniciar triagem</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Ver dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: MessageCircle, title: "Chat inteligente", desc: "Conversação natural com o paciente em qualquer canal." },
            { icon: LayoutDashboard, title: "Fila priorizada", desc: "Classificação automática por urgência (verde, amarelo, vermelho)." },
            { icon: FileUp, title: "Base de conhecimento", desc: "RAG com seus protocolos clínicos e materiais internos." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-card-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
