import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  GitBranch,
  Plus,
  Upload,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/analytics/stat-card";
import { StatusPill } from "@/components/pipeline/status-pill";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { PipelineTemplatePicker } from "@/components/pipeline/template-picker";
import { getDashboardStats } from "@/lib/pipelines.functions";
import { seedDemoIfNeeded } from "@/lib/seed.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const statsFn = useServerFn(getDashboardStats);
  const seedFn = useServerFn(seedDemoIfNeeded);
  const queryClient = useQueryClient();

  // One-shot seed for first-time users so charts render immediately.
  useEffect(() => {
    seedFn()
      .then((res) => { if (res?.seeded) queryClient.invalidateQueries(); })
      .catch(() => { /* non-blocking */ });
  }, [seedFn, queryClient]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
  });

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>;

  const health = data?.successRate ?? 0;
  const healthLabel = health >= 90 ? "Excellent" : health >= 70 ? "Good" : health >= 40 ? "Needs attention" : "Critical";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your data pipelines and recent runs.</p>
        </div>
        <div className="flex gap-2">
          <PipelineTemplatePicker
            trigger={<Button variant="outline"><Plus className="mr-1 h-4 w-4" /> From template</Button>}
          />
          <Button asChild><Link to="/pipelines">New pipeline</Link></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pipelines" value={data?.pipelineCount ?? 0} icon={<GitBranch className="h-4 w-4" />} />
        <StatCard label="Executions" value={data?.executionCount ?? 0} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Records processed" value={(data?.recordsProcessed ?? 0).toLocaleString()} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Success rate" value={`${data?.successRate ?? 0}%`} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pipeline health" value={healthLabel} icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Avg execution time" value={`${data?.avgDurationMs ?? 0} ms`} icon={<Clock className="h-4 w-4" />} />
        <StatCard
          label="Largest dataset"
          value={data?.largestDataset ? `${data.largestDataset.row_count.toLocaleString()} rows` : "—"}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      {/* Trend + Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Execution trend</h2>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </div>
            </div>
            {data?.trend && data.trend.some((d) => d.success + d.failed > 0) ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g-ok" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="g-fail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="success" stroke="var(--color-success)" fill="url(#g-ok)" />
                    <Area type="monotone" dataKey="failed" stroke="var(--color-destructive)" fill="url(#g-fail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No runs yet" description="Run a pipeline to see your success trend here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold">Quick actions</h2>
            <div className="mt-3 space-y-2">
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/pipelines"><span className="flex items-center"><Plus className="mr-2 h-4 w-4" /> New pipeline</span><ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/pipelines"><span className="flex items-center"><Upload className="mr-2 h-4 w-4" /> Upload dataset</span><ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/executions"><span className="flex items-center"><Activity className="mr-2 h-4 w-4" /> View executions</span><ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + uploads */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Recent executions</h2>
            </div>
            {(!data?.recent || data.recent.length === 0) ? (
              <div className="p-5">
                <EmptyState title="No executions yet" description="Run a pipeline to see history here." />
              </div>
            ) : (
              <ul className="divide-y">
                {data.recent.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <StatusPill status={e.status} />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {e.created_at ? format(new Date(e.created_at), "MMM d, HH:mm") : "—"}
                    </span>
                    <span className="font-mono text-xs">{e.records_out?.toLocaleString() ?? 0} rows</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.duration_ms ?? 0}ms</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-3">
              <h2 className="text-sm font-semibold">Recent uploads</h2>
            </div>
            {(!data?.recentUploads || data.recentUploads.length === 0) ? (
              <div className="p-5"><EmptyState title="No uploads yet" description="Upload a dataset from a pipeline page." /></div>
            ) : (
              <ul className="divide-y">
                {data.recentUploads.map((u, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{u.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {u.created_at ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true }) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
