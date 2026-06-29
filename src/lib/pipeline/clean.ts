/**
 * Cleaning operations: deduplication, null handling per column,
 * whitespace trim, case change, and type coercion.
 * All functions are pure — they return a new Table.
 */

import type { CellValue, CleanConfig, ColumnType, Row, Table } from "./types";

function coerceValue(value: CellValue, type: ColumnType): CellValue {
  if (value === null || value === "") return null;
  if (type === "number") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (type === "boolean") {
    const s = String(value).toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
    return null;
  }
  if (type === "date") {
    const t = Date.parse(String(value));
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return String(value);
}

function numericValues(rows: Row[], col: string): number[] {
  const out: number[] = [];
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === "") continue;
    const n = Number(v);
    if (!Number.isNaN(n)) out.push(n);
  }
  return out;
}

function mean(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0) / arr.length;
}
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}
function mode(rows: Row[], col: string): CellValue {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === "") continue;
    const k = String(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) if (n > bestN) ((best = k), (bestN = n));
  return best;
}

export function cleanTable(table: Table, config: CleanConfig): Table {
  let rows = table.rows.map((r) => ({ ...r }));
  let columns = table.columns.map((c) => ({ ...c }));

  // 1) Whitespace + case on string cells
  if (config.trimWhitespace || config.changeCase !== "none") {
    rows = rows.map((row) => {
      const out: Row = {};
      for (const k of Object.keys(row)) {
        let v = row[k];
        if (typeof v === "string") {
          if (config.trimWhitespace) v = v.trim();
          if (config.changeCase === "lower") v = v.toLowerCase();
          if (config.changeCase === "upper") v = v.toUpperCase();
        }
        out[k] = v;
      }
      return out;
    });
  }

  // 2) Per-column null strategy
  for (const [col, strategy] of Object.entries(config.nullStrategies)) {
    if (strategy.kind === "drop") {
      rows = rows.filter((r) => {
        const v = r[col];
        return v !== null && v !== "";
      });
      continue;
    }
    let fill: CellValue = null;
    if (strategy.kind === "mean") {
      const vals = numericValues(rows, col);
      fill = vals.length ? mean(vals) : null;
    } else if (strategy.kind === "median") {
      const vals = numericValues(rows, col);
      fill = vals.length ? median(vals) : null;
    } else if (strategy.kind === "mode") {
      fill = mode(rows, col);
    } else if (strategy.kind === "constant") {
      fill = strategy.value;
    }
    rows = rows.map((r) => {
      const v = r[col];
      if (v === null || v === "") return { ...r, [col]: fill };
      return r;
    });
  }

  // 3) Type coercion + update column metadata
  for (const [col, type] of Object.entries(config.typeCoercions)) {
    rows = rows.map((r) => ({ ...r, [col]: coerceValue(r[col], type) }));
    const idx = columns.findIndex((c) => c.name === col);
    if (idx >= 0) columns[idx] = { ...columns[idx], type };
  }

  // 4) Deduplicate rows (last step so case/trim collapse near-dupes)
  if (config.removeDuplicates) {
    const seen = new Set<string>();
    rows = rows.filter((r) => {
      const k = JSON.stringify(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return { columns, rows };
}
