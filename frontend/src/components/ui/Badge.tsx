import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-panel-border bg-white/5 px-3 py-1 text-xs font-medium text-foreground/80",
        className
      )}
      {...props}
    />
  );
}
