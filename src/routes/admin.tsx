import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { RequireAuth, ADMIN_ROLES, useAuth, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Stethoscope, Users, Building2, LogOut, BookOpen,
  MessageSquare, Settings, Gift, Package, Megaphone, UsersRound,
} from "lucide-react";
import {
  EmergencyAlertsProvider, useEmergencyAlerts,
} from "@/hooks/useEmergencyAlerts";
import { EmergencyAlertBanner } from "@/components/admin/EmergencyAlertBanner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — STOMNI" }],
  }),
  component: AdminLayout,
});

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/triagens", label: "Triagens", icon: MessageSquare },
  { to: "/admin/pacientes", label: "Pacientes", icon: UsersRound },
  { to: "/admin/especialidades", label: "Especialidades", icon: Stethoscope },
  { to: "/admin/profissionais", label: "Profissionais", icon: Users },
  { to: "/admin/unidades", label: "Unidades", icon: Building2 },
  { to: "/admin/conhecimento", label: "Conhecimento", icon: BookOpen },
  { to: "/admin/indicacoes", label: "Indicações", icon: Gift },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

const SUPER_NAV: { to: string; label: string; icon: any }[] = [
  { to: "/super-admin/planos", label: "Planos", icon: Package },
  { to: "/super-admin/indicacoes", label: "Indicações Globais", icon: Megaphone },
];

function AdminLayout() {
  return (
    <RequireAuth roles={ADMIN_ROLES}>
      <EmergencyAlertsProvider>
        <AdminShell />
      </EmergencyAlertsProvider>
    </RequireAuth>
  );
}

function AdminShell() {
  const { data: user } = useAuth();
  const logout = useLogout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="px-3 pb-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              Admin <SseStatusDot />
            </p>
            <p className="truncate text-sm font-medium">{user?.name ?? user?.email}</p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition " +
                    (active
                      ? "bg-accent/70 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {user?.role === "super_admin" && (
              <>
                <p className="mt-4 px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Super Admin
                </p>
                {SUPER_NAV.map((item) => {
                  const active = pathname.startsWith(item.to);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      className={
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition " +
                        (active
                          ? "bg-accent/70 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground")
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
          <div className="px-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </aside>
        <main className="min-w-0">
          <EmergencyAlertBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SseStatusDot() {
  const { connected } = useEmergencyAlerts();
  return (
    <span
      title={connected ? "Alertas em tempo real conectados" : "Desconectado"}
      className={
        "inline-block h-2 w-2 rounded-full " +
        (connected ? "bg-emerald-500" : "bg-muted-foreground/40")
      }
    />
  );
}