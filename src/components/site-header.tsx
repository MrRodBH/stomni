import { Link } from "@tanstack/react-router";
import { Activity, Building2 } from "lucide-react";

interface Props {
  clinicLogoUrl?: string;
  clinicName?: string;
}

export function SiteHeader({ clinicLogoUrl, clinicName = "Clínica Parceira" }: Props) {
  return (
    <header className="border-b border-border/60 bg-background/85 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Activity className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-base">STOMNI</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          <NavItem to="/">Início</NavItem>
          <NavItem to="/triagem">Triagem</NavItem>
          <NavItem to="/dashboard">Dashboard</NavItem>
          <NavItem to="/admin">Admin</NavItem>
        </nav>

        {/* Slot do logo da clínica */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
          {clinicLogoUrl ? (
            <img
              src={clinicLogoUrl}
              alt={clinicName}
              className="h-7 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <>
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-foreground">{clinicName}</span>
            </>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 text-xs md:hidden">
        <NavItem to="/">Início</NavItem>
        <NavItem to="/triagem">Triagem</NavItem>
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/admin">Admin</NavItem>
      </nav>
    </header>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
      activeProps={{ className: "rounded-md px-3 py-2 text-primary bg-accent/60 font-medium" }}
      activeOptions={{ exact: to === "/" }}
    >
      {children}
    </Link>
  );
}
