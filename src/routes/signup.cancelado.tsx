import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/signup/cancelado")({
  head: () => ({ meta: [{ title: "Checkout cancelado — STOMNI" }] }),
  component: SignupCanceled,
});

function SignupCanceled() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-6 py-16">
        <Card className="w-full p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Você cancelou o checkout. Tudo bem!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você pode voltar a qualquer momento. Sua conta ainda não foi cobrada.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/precos">
              <Button variant="outline">Voltar para os planos</Button>
            </Link>
            <Link to="/cadastro" search={{ plan: "trial" }}>
              <Button>Tentar plano Trial</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}