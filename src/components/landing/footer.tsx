"use client";

export function Footer() {
  return (
    <footer className="border-t border-fedge-gold/10 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-fedge-mid to-fedge-dark flex items-center justify-center">
            <span className="text-[10px] font-bold text-fedge-cream">FE</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Fiscal Edge &copy; {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        </div>

        <div className="text-xs text-muted-foreground/50">
          ZIMRA Certified Middleware
        </div>
      </div>
    </footer>
  );
}
