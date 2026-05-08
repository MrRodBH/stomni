import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { billingApi, type CheckoutStatus } from "@/lib/api";

export const Route = createFileRoute("/signup/sucesso")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({ meta: [{ title: "Pagamento confirmado — STOMNI" }] }),
  component: SignupSuccess,
});

type Phase = "polling" | "active" | "failed" | "timeout";

function SignupSuccess() {
  const { session_id } = Route.useSearch();
  const [status, setStatus] = useState<CheckoutStatus | null>(null);
  const [phase, setPhase] = useState<Phase>("polling");
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!session_id) {
      setPhase("failed");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const s = await billingApi.checkoutStatus(session_id);
        if (cancelled) return;
        setStatus(s);
        if (s.payment_status === "paid" || s.tenant_status === "active") {
          setPhase("active");
          return;
        }
        if (s.payment_status === "expired" || s.payment_status === "failed") {
          setPhase("failed");
          return;
        }
      } catch {
        // keep polling
      }
      if (attemptsRef.current >= 10) {
        setPhase("timeout");
        return;
      }
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer!);
    };
  }, [session_id]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-6 py-16">
        <Card className="w-full p-8 text-center">
          {phase === "polling" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <h1 className="mt-4 text-xl font-bold">Confirmando seu pagamento…</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Isso costuma levar alguns segundos.
              </p>
            </>
          )}
          {phase === "active" && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h1 className="mt-4 text-2xl font-bold">🎉 Conta ativada!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tudo pronto. Faça login para acessar seu painel.
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button>Ir para login</Button>
              </Link>
            </>
          )}
          {phase === "failed" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 text-xl font-bold">Pagamento não confirmado</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {status?.payment_status === "expired"
                  ? "A sessão de checkout expirou."
                  : "Houve um problema com o pagamento."}
              </p>
              <Link to="/precos" className="mt-6 inline-block">
                <Button variant="outline">Tentar novamente</Button>
              </Link>
            </>
          )}
          {phase === "timeout" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <h1 className="mt-4 text-xl font-bold">Estamos processando</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Aguarde o email de confirmação. Você já pode tentar entrar.
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button>Ir para login</Button>
              </Link>
            </>
          )}
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}