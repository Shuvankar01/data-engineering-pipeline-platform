/**
 * Serialize a Table back to CSV / JSON / XLSX for download or storage.
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { Table } from "./types";

export type ExportFormat = "csv" | "json" | "xlsx";

export function exportTable(table: Table, format: ExportFormat): Blob {
  if (format === "csv") {
    const csv = Papa.unparse({
      fields: table.columns.map((c) => c.name),
      data: table.rows.map((r) => table.columns.map((c) => r[c.name])),
    });
    return new Blob([csv], { type: "text/csv;charset=utf-8" });
  }
  if (format === "json") {
    return new Blob([JSON.stringify(table.rows, null, 2)], {
      type: "application/json",
    });
  }
  const ws = XLSX.utils.json_to_sheet(table.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function extensionFor(format: ExportFormat): string {
  return format;
}
