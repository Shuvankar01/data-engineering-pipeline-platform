import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { StepStepper, type StepKey } from "@/components/pipeline/step-stepper";
import { StatusPill } from "@/components/pipeline/status-pill";
import { UploadStep } from "@/components/pipeline/upload-step";
import { ValidateStep } from "@/components/pipeline/validate-step";
import { CleanStep } from "@/components/pipeline/clean-step";
import { TransformStep } from "@/components/pipeline/transform-step";
import { AnalyticsStep } from "@/components/pipeline/analytics-step";
import { getPipeline, recordExecution, saveSteps } from "@/lib/pipelines.functions";
import { executePipeline } from "@/lib/pipeline/execute";
import { downloadRawFile } from "@/lib/storage";
import { parseFile } from "@/lib/parse";
import type { Table, StepConfig, CleanConfig, TransformConfig, ValidateConfig } from "@/lib/pipeline/types";

export const Route = createFileRoute("/_authenticated/pipelines/$id")({
  component: PipelineDetailPage,
});

function PipelineDetailPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getPipeline);
  const saveStepsFn = useServerFn(saveSteps);
  const recordFn = useServerFn(recordExecution);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pipeline", id],
    queryFn: () => getFn({ data: { id } }),
  });

  // In-browser state: source table after upload, processed after run
  const [sourceTable, setSourceTable] = useState<Table | null>(null);
  const [processedTable, setProcessedTable] = useState<Table | null>(null);
  const [active, setActive] = useState<StepKey>("upload");
  const [running, setRunning] = useState(false);

  // Step configs (kept locally; persisted on Run)
  const [validateCfg, setValidateCfg] = useState<ValidateConfig>({
    checkMissing: true,
    checkDuplicates: true,
    formatChecks: [],
  });
  const [cleanCfg, setCleanCfg] = useState<CleanConfig>({
    removeDuplicates: true,
    trimWhitespace: true,
    changeCase: "none",
    nullStrategies: {},
    typeCoercions: {},
  });
  const [transformCfg, setTransformCfg] = useState<TransformConfig>({
    renames: {},
    filters: [],
  });

  // Hydrate step configs from DB
  useEffect(() => {
    if (!data?.steps?.length) return;
    for (const s of data.steps) {
      if (s.kind === "validate") setValidateCfg(s.config as unknown as ValidateConfig);
      if (s.kind === "clean") setCleanCfg(s.config as unknown as CleanConfig);
      if (s.kind === "transform") setTransformCfg(s.config as unknown as TransformConfig);
    }
  }, [data]);

  // Re-load source dataset table from storage when pipeline loads
  useEffect(() => {
    if (!data) return;
    const src = data.datasets.find((d) => d.kind === "source");
    if (!src || sourceTable) return;
    (async () => {
      try {
        const blob = await downloadRawFile(src.storage_path);
        const file = new File([blob], src.filename, { type: src.mime ?? undefined });
        const kind = src.filename.toLowerCase().endsWith(".json")
          ? "json"
          : src.filename.toLowerCase().endsWith(".xlsx") || src.filename.toLowerCase().endsWith(".xls")
            ? "xlsx"
            : "csv";
        const table = await parseFile(file, kind);
        setSourceTable(table);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load source dataset");
      }
    })();
  }, [data, sourceTable]);

  async function runPipeline() {
    if (!sourceTable) {
      toast.error("Upload a source dataset first.");
      return;
    }
    setRunning(true);
    const steps: StepConfig[] = [
      { kind: "validate", config: validateCfg },
      { kind: "clean", config: cleanCfg },
      { kind: "transform", config: transformCfg },
    ];
    try {
      // Persist step configs
      await saveStepsFn({
        data: {
          pipelineId: id,
          steps: steps.map((s, i) => ({
            kind: s.kind,
            config: s.config as unknown as Record<string, unknown>,
            order_index: i,
          })),
        },
      });

      const { output, summary } = await executePipeline(sourceTable, steps);
      setProcessedTable(output);
      await recordFn({
        data: {
          pipelineId: id,
          status: "success",
          recordsIn: summary.recordsIn,
          recordsOut: summary.recordsOut,
          durationMs: summary.totalDurationMs,
          summary: summary as unknown as Record<string, unknown>,
        },
      });
      toast.success(`Pipeline ran in ${summary.totalDurationMs} ms`);
      setActive("analytics");
      await refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(message);
      try {
        await recordFn({
          data: {
            pipelineId: id,
            status: "failed",
            recordsIn: sourceTable.rows.length,
            recordsOut: 0,
            durationMs: 0,
            error: message,
            summary: {},
          },
        });
      } catch {
        /* ignore */
      }
      await refetch();
    } finally {
      setRunning(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data) return <div className="p-6"><ErrorState onRetry={() => refetch()} /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{data.pipeline.name}</h1>
          {data.pipeline.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{data.pipeline.description}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={data.pipeline.status} />
            <span className="text-xs text-muted-foreground">
              {data.executions.length} execution{data.executions.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <Button onClick={runPipeline} disabled={running || !sourceTable}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Run pipeline
        </Button>
      </div>

      <StepStepper active={active} onChange={setActive} />

      {active === "upload" && (
        <UploadStep
          pipelineId={id}
          existingDataset={data.datasets.find((d) => d.kind === "source") ?? null}
          sourceTable={sourceTable}
          onTableReady={setSourceTable}
          onUploaded={() => refetch()}
        />
      )}
      {active === "validate" && (
        <ValidateStep
          table={sourceTable}
          config={validateCfg}
          onChange={setValidateCfg}
        />
      )}
      {active === "clean" && (
        <CleanStep
          table={sourceTable}
          config={cleanCfg}
          onChange={setCleanCfg}
        />
      )}
      {active === "transform" && (
        <TransformStep
          table={sourceTable}
          config={transformCfg}
          onChange={setTransformCfg}
        />
      )}
      {active === "analytics" && (
        <AnalyticsStep
          pipelineId={id}
          processedTable={processedTable}
          executions={data.executions}
        />
      )}
    </div>
  );
}
