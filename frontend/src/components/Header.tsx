import Link from "next/link";
import { Mic2, Settings, TrendingUp } from "lucide-react";

export function Header() {
  return (
    <header className="w-full flex items-center justify-center py-4 sm:py-5 px-4 border-b border-panel-border/60 relative print:hidden">
      <Link href="/" className="flex items-center gap-2 text-base font-medium text-foreground/80 hover:text-foreground">
        <Mic2 size={18} className="text-accent-2 shrink-0" />
        <span className="hidden sm:inline">Pocket Interview Coach</span>
        <span className="sm:hidden">Interview Coach</span>
      </Link>
      <div className="absolute right-4 sm:right-6 flex items-center gap-3 sm:gap-4">
        <Link
          href="/history"
          className="text-foreground/50 hover:text-foreground transition-colors"
          aria-label="Progress history"
        >
          <TrendingUp size={20} />
        </Link>
        <Link
          href="/settings"
          className="text-foreground/50 hover:text-foreground transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
