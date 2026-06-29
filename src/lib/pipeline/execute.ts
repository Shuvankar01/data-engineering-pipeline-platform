/**
 * Pipeline execution engine. Runs ordered steps over an input Table,
 * captures per-step metrics, errors, and a JSON summary for storage.
 */

import { cleanTable } from "./clean";
import { transformTable } from "./transform";
import { validateTable } from "./validate";
import type { ExecutionSummary, StepConfig, StepResult, Table } from "./types";

export async function executePipeline(
  input: Table,
  steps: StepConfig[],
): Promise<{ output: Table; summary: ExecutionSummary }> {
  const stepResults: StepResult[] = [];
  let current = input;
  const startedAt = performance.now();
  const recordsIn = input.rows.length;

  for (const step of steps) {
    const stepStart = performance.now();
    const inCount = current.rows.length;
    try {
      if (step.kind === "validate") {
        const report = validateTable(current, step.config);
        stepResults.push({
          kind: "validate",
          recordsIn: inCount,
          recordsOut: inCount,
          durationMs: Math.round(performance.now() - stepStart),
          report,
          notes: [
            `${report.duplicateRowCount} duplicate rows detected`,
            `${Object.values(report.missingByColumn).reduce((a, b) => a + b, 0)} missing cells across columns`,
          ],
        });
      } else if (step.kind === "clean") {
        current = cleanTable(current, step.config);
        stepResults.push({
          kind: "clean",
          recordsIn: inCount,
          recordsOut: current.rows.length,
          durationMs: Math.round(performance.now() - stepStart),
          notes: [
            `removed ${inCount - current.rows.length} rows`,
            step.config.removeDuplicates ? "deduplicated" : "kept duplicates",
          ],
        });
      } else if (step.kind === "transform") {
        current = transformTable(current, step.config);
        stepResults.push({
          kind: "transform",
          recordsIn: inCount,
          recordsOut: current.rows.length,
          durationMs: Math.round(performance.now() - stepStart),
          notes: [
            Object.keys(step.config.renames ?? {}).length
              ? `renamed ${Object.keys(step.config.renames).length} columns`
              : "no renames",
            (step.config.filters ?? []).length
              ? `applied ${step.config.filters.length} filter(s)`
              : "no filters",
            step.config.aggregation?.groupBy.length
              ? `grouped by ${step.config.aggregation.groupBy.join(", ")}`
              : "no aggregation",
          ],
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Step "${step.kind}" failed: ${message}`);
    }
  }

  return {
    output: current,
    summary: {
      steps: stepResults,
      totalDurationMs: Math.round(performance.now() - startedAt),
      recordsIn,
      recordsOut: current.rows.length,
    },
  };
}
