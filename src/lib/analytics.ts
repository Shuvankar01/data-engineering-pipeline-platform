/**
 * Analytics: per-column statistics and chart-ready aggregations.
 */

import type { Table } from "./pipeline/types";

export interface ColumnStat {
  name: string;
  type: string;
  nullCount: number;
  nullPercent: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  topCategories?: Array<{ value: string; count: number }>;
  histogram?: Array<{ bucket: string; count: number }>;
}

export function computeStats(table: Table): ColumnStat[] {
  const rowCount = table.rows.length || 1;
  return table.columns.map((col) => {
    const values = table.rows.map((r) => r[col.name]);
    const nonNull = values.filter((v) => v !== null && v !== "");
    const nullCount = values.length - nonNull.length;
    const unique = new Set(nonNull.map((v) => String(v))).size;
    const stat: ColumnStat = {
      name: col.name,
      type: col.type,
      nullCount,
      nullPercent: Math.round((nullCount / rowCount) * 1000) / 10,
      unique,
    };
    if (col.type === "number") {
      const nums = nonNull.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
      if (nums.length) {
        stat.min = Math.min(...nums);
        stat.max = Math.max(...nums);
        stat.mean =
          Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100;
        stat.histogram = buildHistogram(nums, 8);
      }
    } else {
      const counts = new Map<string, number>();
      for (const v of nonNull) {
        const k = String(v);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      stat.topCategories = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({ value, count }));
    }
    return stat;
  });
}

function buildHistogram(nums: number[], bins: number) {
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ bucket: String(min), count: nums.length }];
  const width = (max - min) / bins;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    bucket: `${(min + i * width).toFixed(1)}`,
    count: 0,
  }));
  for (const n of nums) {
    const idx = Math.min(bins - 1, Math.floor((n - min) / width));
    buckets[idx].count++;
  }
  return buckets;
}
