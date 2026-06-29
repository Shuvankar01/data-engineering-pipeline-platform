import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  running: "bg-warning/15 text-warning-foreground border border-warning/30",
  success: "bg-success/15 text-success-foreground border border-success/30",
  failed: "bg-destructive/15 text-destructive border border-destructive/30",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[status] ?? styles.draft,
      )}
    >
      {status}
    </span>
  );
}
