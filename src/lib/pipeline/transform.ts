/**
 * Transformation: rename columns, filter rows by predicate chain,
 * and group-by aggregation (sum / avg / count). All pure.
 */

import type { CellValue, Column, FilterOp, Row, Table, TransformConfig } from "./types";

function matches(op: FilterOp, cell: CellValue, raw: string): boolean {
  if (cell === null || cell === undefined) return op === "neq";
  const asNum = Number(cell);
  const valNum = Number(raw);
  const useNumeric =
    !Number.isNaN(asNum) && !Number.isNaN(valNum) && raw.trim() !== "";
  const a = useNumeric ? asNum : String(cell).toLowerCase();
  const b = useNumeric ? valNum : raw.toLowerCase();
  switch (op) {
    case "eq": return a === b;
    case "neq": return a !== b;
    case "gt": return a > b;
    case "gte": return a >= b;
    case "lt": return a < b;
    case "lte": return a <= b;
    case "contains":
      return String(cell).toLowerCase().includes(raw.toLowerCase());
  }
}

export function transformTable(table: Table, config: TransformConfig): Table {
  let columns = table.columns.map((c) => ({ ...c }));
  let rows = table.rows.map((r) => ({ ...r }));

  // 1) Rename columns
  const renames = config.renames ?? {};
  if (Object.keys(renames).length) {
    columns = columns.map((c) =>
      renames[c.name] ? { ...c, name: renames[c.name] } : c,
    );
    rows = rows.map((r) => {
      const out: Row = {};
      for (const k of Object.keys(r)) out[renames[k] ?? k] = r[k];
      return out;
    });
  }

  // 2) Filter chain (AND)
  for (const f of config.filters ?? []) {
    rows = rows.filter((r) => matches(f.op, r[f.column] ?? null, f.value));
  }

  // 3) Group-by aggregation
  if (config.aggregation && config.aggregation.groupBy.length) {
    const { groupBy, aggregations } = config.aggregation;
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const key = JSON.stringify(groupBy.map((g) => r[g] ?? null));
      const bucket = groups.get(key);
      if (bucket) bucket.push(r);
      else groups.set(key, [r]);
    }
    const newRows: Row[] = [];
    for (const bucket of groups.values()) {
      const sample = bucket[0];
      const out: Row = {};
      for (const g of groupBy) out[g] = sample[g] ?? null;
      for (const a of aggregations) {
        const label = a.as ?? `${a.fn}_${a.column}`;
        if (a.fn === "count") {
          out[label] = bucket.length;
        } else {
          const nums = bucket
            .map((r) => Number(r[a.column]))
            .filter((n) => !Number.isNaN(n));
          if (nums.length === 0) out[label] = null;
          else if (a.fn === "sum") out[label] = nums.reduce((s, n) => s + n, 0);
          else if (a.fn === "avg")
            out[label] = nums.reduce((s, n) => s + n, 0) / nums.length;
        }
      }
      newRows.push(out);
    }
    const newCols: Column[] = [
      ...groupBy.map((g) => ({
        name: g,
        type: columns.find((c) => c.name === g)?.type ?? "string",
      })),
      ...aggregations.map((a) => ({
        name: a.as ?? `${a.fn}_${a.column}`,
        type: "number" as const,
      })),
    ];
    return { columns: newCols, rows: newRows };
  }

  return { columns, rows };
}
