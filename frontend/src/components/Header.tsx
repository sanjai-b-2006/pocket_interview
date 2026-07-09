import Link from "next/link";
import { Mic2, Settings } from "lucide-react";

export function Header() {
  return (
    <header className="w-full flex items-center justify-center py-5 border-b border-panel-border/60 relative">
      <Link href="/" className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground">
        <Mic2 size={16} className="text-accent-2" />
        Pocket Interview Coach
      </Link>
      <Link
        href="/settings"
        className="absolute right-6 text-foreground/50 hover:text-foreground transition-colors"
        aria-label="Settings"
      >
        <Settings size={18} />
      </Link>
    </header>
  );
}
