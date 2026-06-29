import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepKey = "upload" | "validate" | "clean" | "transform" | "analytics";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "validate", label: "Validate" },
  { key: "clean", label: "Clean" },
  { key: "transform", label: "Transform" },
  { key: "analytics", label: "Analytics" },
];

export function StepStepper({
  active,
  onChange,
}: {
  active: StepKey;
  onChange: (k: StepKey) => void;
}) {
  const activeIdx = STEPS.findIndex((s) => s.key === active);
  return (
    <nav className="flex w-full items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {STEPS.map((s, i) => {
        const done = i < activeIdx;
        const current = i === activeIdx;
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
            className={cn(
              "flex flex-1 min-w-[120px] items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              current && "bg-primary text-primary-foreground",
              !current && done && "text-foreground hover:bg-muted",
              !current && !done && "text-muted-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                current && "bg-primary-foreground/20",
                !current && done && "bg-success/20 text-success-foreground",
                !current && !done && "bg-muted",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
