import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileJson, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/analytics/stat-card";
import { StatusPill } from "@/components/pipeline/status-pill";
import { EmptyState } from "@/components/common/empty-state";
import { computeStats } from "@/lib/analytics";
import { exportTable, type ExportFormat } from "@/lib/pipeline/export";
import { supabase } from "@/integrations/supabase/client";
import { uploadProcessedBlob } from "@/lib/storage";
import { recordDataset } from "@/lib/pipelines.functions";
import type { Table } from "@/lib/pipeline/types";
import type { Tables } from "@/integrations/supabase/types";

export function AnalyticsStep({
  pipelineId,
  processedTable,
  executions,
}: {
  pipelineId: string;
  processedTable: Table | null;
  executions: Array<Tables<"executions">>;
}) {
  const stats = useMemo(() => (processedTable ? computeStats(processedTable) : []), [processedTable]);
  const recordFn = useServerFn(recordDataset);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  if (!processedTable) {
    return (
      <EmptyState
        title="No processed dataset yet"
        description='Click "Run pipeline" to execute your steps and see analytics here.'
      />
    );
  }

  const rowCount = processedTable.rows.length;
  const colCount = processedTable.columns.length;
  const totalCells = rowCount * colCount || 1;
  const nullCells = stats.reduce((s, c) => s + c.nullCount, 0);
  const nullPct = Math.round((nullCells / totalCells) * 1000) / 10;

  async function handleDownload(fmt: ExportFormat) {
    if (!processedTable) return;
    setDownloading(fmt);
    try {
      const blob = exportTable(processedTable, fmt);
      // Local download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `processed.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      // Persist to processed-datasets bucket + metadata
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { path } = await uploadProcessedBlob(u.user.id, pipelineId, `processed.${fmt}`, blob);
        await recordFn({
          data: {
            pipelineId,
            kind: "processed",
            filename: `processed.${fmt}`,
            storagePath: path,
            mime: blob.type,
            rowCount,
            columnCount: colCount,
            schema: processedTable.columns.map((c) => ({ name: c.name, type: c.type })),
          },
        });
      }
      toast.success(`Downloaded processed.${fmt}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  const numericStats = stats.filter((s) => s.histogram);
  const categoryStats = stats.filter((s) => s.topCategories && s.topCategories.length > 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rows" value={rowCount.toLocaleString()} />
        <StatCard label="Columns" value={colCount} />
        <StatCard label="Null %" value={`${nullPct}%`} />
        <StatCard label="Numeric cols" value={numericStats.length} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm font-medium">Download processed dataset:</span>
          <Button size="sm" variant="outline" onClick={() => handleDownload("csv")} disabled={downloading !== null}>
            {downloading === "csv" ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <FileText className="mr-1.5 h-3 w-3" />}
            CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDownload("json")} disabled={downloading !== null}>
            {downloading === "json" ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <FileJson className="mr-1.5 h-3 w-3" />}
            JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDownload("xlsx")} disabled={downloading !== null}>
            {downloading === "xlsx" ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <FileSpreadsheet className="mr-1.5 h-3 w-3" />}
            XLSX
          </Button>
        </CardContent>
      </Card>

      {numericStats.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {numericStats.slice(0, 4).map((s) => (
            <Card key={s.name}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h4 className="font-mono text-xs">{s.name}</h4>
                  <span className="text-[10px] text-muted-foreground">
                    min {s.min} · max {s.max} · mean {s.mean}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={s.histogram}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {categoryStats.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {categoryStats.slice(0, 4).map((s) => (
            <Card key={s.name}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h4 className="font-mono text-xs">{s.name}</h4>
                  <span className="text-[10px] text-muted-foreground">{s.unique} unique values</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={s.topCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="value" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ fontSize: 11 }} />
                    <Bar dataKey="count" fill="var(--color-chart-2)" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Null heatmap</h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.name} className="rounded-md border p-2">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="truncate">{s.name}</span>
                  <span className="text-muted-foreground">{s.nullPercent}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, s.nullPercent)}%`,
                      backgroundColor: s.nullPercent > 30 ? "var(--color-destructive)" : s.nullPercent > 5 ? "var(--color-warning)" : "var(--color-success)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold">Execution history</h3>
          </div>
          {executions.length === 0 ? (
            <div className="p-5"><EmptyState title="No executions yet" /></div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 text-left font-medium">Status</th>
                  <th className="px-5 py-2 text-left font-medium">In → Out</th>
                  <th className="px-5 py-2 text-left font-medium">Duration</th>
                  <th className="px-5 py-2 text-left font-medium">When</th>
                  <th className="px-5 py-2 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {executions.slice(0, 10).map((e) => (
                  <tr key={e.id} className="border-b last:border-b-0 align-top">
                    <td className="px-5 py-2.5"><StatusPill status={e.status} /></td>
                    <td className="px-5 py-2.5 font-mono">{e.records_in} → {e.records_out}</td>
                    <td className="px-5 py-2.5 font-mono">{e.duration_ms} ms</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{format(new Date(e.created_at), "MMM d, HH:mm")}</td>
                    <td className="px-5 py-2.5 text-muted-foreground">{e.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

