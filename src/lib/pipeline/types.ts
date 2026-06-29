/**
 * Core domain types for the in-browser pipeline engine.
 * A Table is a normalized, column-typed dataset that flows
 * through each step (validate → clean → transform).
 */

export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;
export type ColumnType = "string" | "number" | "boolean" | "date" | "unknown";

export interface Column {
  name: string;
  type: ColumnType;
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

// ----- Step configurations -----------------------------------------------

export type FormatCheck = "email" | "number" | "date" | "regex";

export interface ValidateConfig {
  checkMissing: boolean;
  checkDuplicates: boolean;
  formatChecks: Array<{
    column: string;
    check: FormatCheck;
    pattern?: string; // for regex
  }>;
}

export type NullStrategy =
  | { kind: "drop" }
  | { kind: "mean" }
  | { kind: "median" }
  | { kind: "mode" }
  | { kind: "constant"; value: string };

export interface CleanConfig {
  removeDuplicates: boolean;
  trimWhitespace: boolean;
  changeCase: "none" | "lower" | "upper";
  nullStrategies: Record<string, NullStrategy>;
  typeCoercions: Record<string, ColumnType>;
}

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";
export type AggFn = "sum" | "avg" | "count";

export interface TransformConfig {
  renames: Record<string, string>; // oldName -> newName
  filters: Array<{ column: string; op: FilterOp; value: string }>;
  aggregation?: {
    groupBy: string[];
    aggregations: Array<{ column: string; fn: AggFn; as?: string }>;
  };
}

export type StepConfig =
  | { kind: "validate"; config: ValidateConfig }
  | { kind: "clean"; config: CleanConfig }
  | { kind: "transform"; config: TransformConfig };

// ----- Execution reports -------------------------------------------------

export interface ValidationReport {
  missingByColumn: Record<string, number>;
  duplicateRowCount: number;
  formatFailures: Array<{ column: string; check: FormatCheck; failed: number }>;
}

export interface StepResult {
  kind: "validate" | "clean" | "transform";
  recordsIn: number;
  recordsOut: number;
  durationMs: number;
  report?: ValidationReport;
  notes: string[];
}

export interface ExecutionSummary {
  steps: StepResult[];
  totalDurationMs: number;
  recordsIn: number;
  recordsOut: number;
}
