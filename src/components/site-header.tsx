import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-hero)" }}>
            <Activity className="h-4 w-4 text-primary-foreground" />
          </span>
          STOMNI
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/triagem"
            className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-muted font-medium" }}
          >
            Triagem
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-muted font-medium" }}
          >
            Dashboard
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
            activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-muted font-medium" }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}