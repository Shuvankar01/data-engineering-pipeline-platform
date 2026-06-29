/**
 * Validation: missing values, duplicates, and per-column format checks
 * (email / number / date / regex). Returns a report; does NOT mutate the table.
 */

import type { FormatCheck, Table, ValidateConfig, ValidationReport } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isFailing(check: FormatCheck, value: unknown, pattern?: string): boolean {
  if (value === null || value === undefined || value === "") return false;
  const s = String(value).trim();
  switch (check) {
    case "email":
      return !EMAIL_RE.test(s);
    case "number":
      return Number.isNaN(Number(s));
    case "date":
      return Number.isNaN(Date.parse(s));
    case "regex": {
      if (!pattern) return false;
      try {
        return !new RegExp(pattern).test(s);
      } catch {
        return true; // invalid regex => fail
      }
    }
  }
}

export function validateTable(table: Table, config: ValidateConfig): ValidationReport {
  const missingByColumn: Record<string, number> = {};
  if (config.checkMissing) {
    for (const col of table.columns) {
      let n = 0;
      for (const row of table.rows) {
        const v = row[col.name];
        if (v === null || v === undefined || v === "") n++;
      }
      missingByColumn[col.name] = n;
    }
  }

  let duplicateRowCount = 0;
  if (config.checkDuplicates) {
    const seen = new Set<string>();
    for (const row of table.rows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicateRowCount++;
      else seen.add(key);
    }
  }

  const formatFailures = config.formatChecks.map(({ column, check, pattern }) => {
    let failed = 0;
    for (const row of table.rows) {
      if (isFailing(check, row[column], pattern)) failed++;
    }
    return { column, check, failed };
  });

  return { missingByColumn, duplicateRowCount, formatFailures };
}
