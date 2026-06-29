import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { createPipeline } from "@/lib/pipelines.functions";
import { PIPELINE_TEMPLATES } from "@/lib/templates";

/**
 * Template picker dialog. Creating a pipeline from a template just sets the
 * pipeline's name + description; the user fills in steps in the workflow UI.
 */
export function PipelineTemplatePicker({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createPipeline);

  const create = useMutation({
    mutationFn: (vars: { name: string; description?: string }) => createFn({ data: vars }),
    onSuccess: (row) => {
      toast.success("Pipeline created");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      setOpen(false);
      navigate({ to: "/pipelines/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button><Plus className="mr-1 h-4 w-4" /> New from template</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start a new pipeline</DialogTitle>
        </DialogHeader>
        <ScrollArea className="-mr-2 max-h-[60vh] pr-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {PIPELINE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate({ name: t.name, description: t.description })}
                className="group flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm disabled:opacity-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <t.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
        {create.isPending ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Creating…
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
