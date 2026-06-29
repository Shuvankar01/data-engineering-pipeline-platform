/**
 * Parsers normalize any supported file into a typed Table.
 * Type inference uses a simple voting scheme over the first N rows.
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Column, ColumnType, Row, Table } from "../pipeline/types";

const SAMPLE_FOR_INFERENCE = 200;

function inferColumnType(values: unknown[]): ColumnType {
  let nums = 0,
    bools = 0,
    dates = 0,
    nonNull = 0;
  for (const raw of values) {
    if (raw === null || raw === undefined || raw === "") continue;
    nonNull++;
    const s = String(raw).trim();
    if (s === "true" || s === "false") {
      bools++;
      continue;
    }
    if (!isNaN(Number(s)) && s !== "") {
      nums++;
      continue;
    }
    const t = Date.parse(s);
    if (!Number.isNaN(t) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(s)) {
      dates++;
    }
  }
  if (nonNull === 0) return "unknown";
  if (nums / nonNull > 0.9) return "number";
  if (bools / nonNull > 0.9) return "boolean";
  if (dates / nonNull > 0.7) return "date";
  return "string";
}

function coerce(value: unknown, type: ColumnType) {
  if (value === null || value === undefined || value === "") return null;
  if (type === "number") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (type === "boolean") {
    const s = String(value).toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    return null;
  }
  return String(value);
}

function buildTable(rawRows: Array<Record<string, unknown>>): Table {
  if (rawRows.length === 0) return { columns: [], rows: [] };
  const columnNames = Array.from(
    new Set(rawRows.flatMap((r) => Object.keys(r))),
  );
  const sample = rawRows.slice(0, SAMPLE_FOR_INFERENCE);
  const columns: Column[] = columnNames.map((name) => ({
    name,
    type: inferColumnType(sample.map((r) => r[name])),
  }));
  const rows: Row[] = rawRows.map((r) => {
    const out: Row = {};
    for (const c of columns) out[c.name] = coerce(r[c.name], c.type);
    return out;
  });
  return { columns, rows };
}

/** Parse CSV via PapaParse with header detection. */
export function parseCsv(text: string): Table {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (parsed.errors.length && parsed.data.length === 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0]?.message ?? "unknown"}`);
  }
  return buildTable(parsed.data);
}

/** Parse JSON: accepts either an array of objects or { rows: [...] }. */
export function parseJson(text: string): Table {
  const data = JSON.parse(text);
  let arr: Array<Record<string, unknown>>;
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray((data as { rows?: unknown[] }).rows))
    arr = (data as { rows: Array<Record<string, unknown>> }).rows;
  else throw new Error("JSON must be an array of objects or { rows: [...] }.");
  return buildTable(arr);
}

/** Parse XLSX/XLS via SheetJS, first sheet only. */
export function parseXlsx(buffer: ArrayBuffer): Table {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook contains no sheets.");
  const sheet = wb.Sheets[sheetName];
  const arr = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });
  return buildTable(arr);
}

/** High-level: parse any supported file into a Table. */
export async function parseFile(
  file: File,
  kind: "csv" | "json" | "xlsx",
): Promise<Table> {
  if (kind === "csv") return parseCsv(await file.text());
  if (kind === "json") return parseJson(await file.text());
  return parseXlsx(await file.arrayBuffer());
}
