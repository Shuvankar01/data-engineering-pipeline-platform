import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "@/components/pipeline/status-pill";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { PipelineTemplatePicker } from "@/components/pipeline/template-picker";
import { notify } from "@/components/notifications/notification-provider";
import {
  clonePipeline,
  createPipeline,
  deletePipeline,
  listPipelines,
  renamePipeline,
} from "@/lib/pipelines.functions";

export const Route = createFileRoute("/_authenticated/pipelines/")({
  component: PipelinesPage,
});

function PipelinesPage() {
  const listFn = useServerFn(listPipelines);
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pipelines"],
    queryFn: () => listFn(),
  });

  const [q, setQ] = useState("");
  const [renameOpen, setRenameOpen] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createFn = useServerFn(createPipeline);
  const create = useMutation({
    mutationFn: (vars: { name: string; description?: string }) => createFn({ data: vars }),
    onSuccess: () => {
      toast.success("Pipeline created");
      notify("success", "Pipeline created", name);
      setCreateOpen(false); setName(""); setDescription("");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameFn = useServerFn(renamePipeline);
  const rename = useMutation({
    mutationFn: (vars: { id: string; name: string }) => renameFn({ data: vars }),
    onSuccess: () => {
      toast.success("Renamed"); setRenameOpen(null);
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cloneFn = useServerFn(clonePipeline);
  const clone = useMutation({
    mutationFn: (id: string) => cloneFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Pipeline cloned");
      notify("info", "Pipeline cloned");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFn = useServerFn(deletePipeline);
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>;

  const filtered = (data ?? []).filter((p) =>
    !q || `${p.name} ${p.description ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
          <p className="text-sm text-muted-foreground">Create and manage your data pipelines.</p>
        </div>
        <div className="flex gap-2">
          <PipelineTemplatePicker
            trigger={<Button variant="outline"><Plus className="mr-1 h-4 w-4" /> From template</Button>}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New pipeline
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pipelines…" className="pl-8" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={q ? "No matching pipelines" : "No pipelines yet"}
          description={q ? "Try a different search term." : "Create your first pipeline to upload a dataset and start processing."}
          action={!q ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> New pipeline</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="group transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/pipelines/$id" params={{ id: p.id }} className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">{p.name}</h3>
                    {p.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    ) : null}
                  </Link>
                  <StatusPill status={p.status} />
                </div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Updated {format(new Date(p.updated_at), "MMM d, yyyy")}
                </p>
                <div className="flex flex-wrap gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setRenameOpen({ id: p.id, name: p.name }); setRenameValue(p.name); }}>
                    <Pencil className="mr-1 h-3 w-3" /> Rename
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={clone.isPending} onClick={() => clone.mutate(p.id)}>
                    <Copy className="mr-1 h-3 w-3" /> Clone
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive"
                    onClick={() => {
                      if (confirm(`Delete pipeline "${p.name}"? This cannot be undone.`)) del.mutate(p.id);
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create pipeline</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="p-name">Name</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My orders pipeline" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this pipeline do?" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate({ name, description: description || undefined })} disabled={!name || create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renameOpen} onOpenChange={(o) => { if (!o) setRenameOpen(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename pipeline</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(null)}>Cancel</Button>
            <Button
              disabled={!renameValue || !renameOpen || rename.isPending}
              onClick={() => renameOpen && rename.mutate({ id: renameOpen.id, name: renameValue })}
            >
              {rename.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
