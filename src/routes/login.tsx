import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth, useLogin, isAdminRole } from "@/lib/auth";
import logoUrl from "@/assets/stomni-logo.jpeg";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — STOMNI" },
      { name: "description", content: "Acesse o painel STOMNI." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: user } = useAuth();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate({ to: isAdminRole(user.role) ? "/admin" : "/dashboard", replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const u = await login.mutateAsync({ email, password });
      toast.success(`Bem-vindo, ${u.name ?? u.email}`);
      navigate({ to: isAdminRole(u.role) ? "/admin" : "/dashboard", replace: true });
    } catch (err: any) {
      if (err?.response?.status === 401) toast.error("Credenciais inválidas");
      else toast.error("Não foi possível entrar. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="grid place-items-center px-4 py-12">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <img src={logoUrl} alt="STOMNI" className="h-14 w-auto rounded-md" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Entrar no STOMNI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse o painel da sua clínica.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-lg"
            disabled={login.isPending}
          >
            {login.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
            ) : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Voltar ao site</Link>
        </p>
      </Card>
      </div>
    </div>
  );
}