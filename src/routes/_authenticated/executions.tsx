import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/pipeline/status-pill";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { listExecutions } from "@/lib/executions.functions";

export const Route = createFileRoute("/_authenticated/executions")({
  component: ExecutionsPage,
});

type SortKey = "newest" | "oldest" | "longest" | "shortest";

function ExecutionsPage() {
  const fn = useServerFn(listExecutions);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["executions-history"],
    queryFn: () => fn(),
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "success" | "failed" | "running" | "pending">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const arr = data.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (q && !`${e.pipeline_name ?? ""} ${e.error ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "longest") return (b.duration_ms ?? 0) - (a.duration_ms ?? 0);
      return (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
    });
    return arr;
  }, [data, q, status, sort]);

  if (isLoading) return <LoadingState label="Loading execution history…" />;
  if (error) return <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Execution history</h1>
        <p className="text-sm text-muted-foreground">Every pipeline run logged with timing and summary.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by pipeline or error…" className="pl-8" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="longest">Longest first</SelectItem>
            <SelectItem value="shortest">Shortest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6"><EmptyState title="No executions found" description="Try clearing filters or run a pipeline." /></div>
          ) : (
            <ul className="divide-y">
              {filtered.map((e) => {
                const expanded = openId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(expanded ? null : e.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/40"
                    >
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <StatusPill status={e.status} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.pipeline_name ?? "Pipeline"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "MMM d, yyyy · HH:mm")}</p>
                      </div>
                      <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <p>{e.records_out?.toLocaleString() ?? 0} rows out</p>
                        <p className="font-mono">{e.duration_ms ?? 0} ms</p>
                      </div>
                    </button>
                    {expanded ? (
                      <div className="space-y-3 border-t bg-muted/20 px-5 py-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Stat label="Records in" value={e.records_in?.toLocaleString() ?? "0"} />
                          <Stat label="Records out" value={e.records_out?.toLocaleString() ?? "0"} />
                          <Stat label="Duration" value={`${e.duration_ms ?? 0} ms`} />
                          <Stat label="Status" value={e.status} />
                        </div>
                        {e.error ? (
                          <pre className="overflow-x-auto rounded border bg-destructive/5 p-3 text-destructive">{e.error}</pre>
                        ) : null}
                        <details>
                          <summary className="cursor-pointer text-muted-foreground">Summary JSON</summary>
                          <pre className="mt-2 overflow-x-auto rounded border bg-card p-3 font-mono">
                            {JSON.stringify(e.summary, null, 2)}
                          </pre>
                        </details>
                        <div>
                          <Button asChild variant="outline" size="sm">
                            <Link to="/pipelines/$id" params={{ id: e.pipeline_id }}>Open pipeline</Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono">{value}</p>
    </div>
  );
}
