import logoUrl from "@/assets/stomni-logo.jpeg";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="STOMNI"
            className="h-7 w-auto rounded opacity-70"
            style={{ height: 28 }}
          />
          <span>
            © 2026 STOMNI · Sistema de Triagem Omnichannel · Todos os direitos reservados
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition">Privacidade</a>
          <a href="#" className="hover:text-foreground transition">Termos</a>
          <a href="#" className="hover:text-foreground transition">Contato</a>
        </nav>
      </div>
    </footer>
  );
}