import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { DatasetPreviewTable } from "@/components/pipeline/dataset-preview-table";
import { transformTable } from "@/lib/pipeline/transform";
import type { AggFn, FilterOp, Table, TransformConfig } from "@/lib/pipeline/types";

export function TransformStep({
  table,
  config,
  onChange,
}: {
  table: Table | null;
  config: TransformConfig;
  onChange: (c: TransformConfig) => void;
}) {
  const preview = useMemo(() => (table ? transformTable(table, config) : null), [table, config]);
  if (!table) return <EmptyState title="Upload a dataset first" />;

  const groupBy = config.aggregation?.groupBy ?? [];
  const aggs = config.aggregation?.aggregations ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Rename columns</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {table.columns.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-32 truncate font-mono text-xs text-muted-foreground">{c.name}</span>
                <Input
                  className="h-8 font-mono text-xs"
                  placeholder="new name"
                  value={config.renames[c.name] ?? ""}
                  onChange={(e) => {
                    const next = { ...config.renames };
                    if (e.target.value) next[c.name] = e.target.value;
                    else delete next[c.name];
                    onChange({ ...config, renames: next });
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filters (AND)</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  ...config,
                  filters: [...config.filters, { column: table.columns[0]?.name ?? "", op: "eq", value: "" }],
                })
              }
            >
              <Plus className="mr-1 h-3 w-3" /> Add filter
            </Button>
          </div>
          {config.filters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No filters. The full dataset will be passed through.</p>
          ) : (
            <div className="space-y-2">
              {config.filters.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Select
                    value={f.column}
                    onValueChange={(v) => {
                      const next = [...config.filters];
                      next[i] = { ...next[i], column: v };
                      onChange({ ...config, filters: next });
                    }}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {table.columns.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={f.op}
                    onValueChange={(v) => {
                      const next = [...config.filters];
                      next[i] = { ...next[i], op: v as FilterOp };
                      onChange({ ...config, filters: next });
                    }}
                  >
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">=</SelectItem>
                      <SelectItem value="neq">≠</SelectItem>
                      <SelectItem value="gt">&gt;</SelectItem>
                      <SelectItem value="gte">≥</SelectItem>
                      <SelectItem value="lt">&lt;</SelectItem>
                      <SelectItem value="lte">≤</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-48 font-mono"
                    value={f.value}
                    onChange={(e) => {
                      const next = [...config.filters];
                      next[i] = { ...next[i], value: e.target.value };
                      onChange({ ...config, filters: next });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => onChange({ ...config, filters: config.filters.filter((_, idx) => idx !== i) })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Group by + aggregate</h3>
          <div>
            <Label className="text-xs">Group by columns</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {table.columns.map((c) => {
                const active = groupBy.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      const next = active ? groupBy.filter((g) => g !== c.name) : [...groupBy, c.name];
                      onChange({
                        ...config,
                        aggregation: { groupBy: next, aggregations: aggs },
                      });
                    }}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Aggregations</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...config,
                    aggregation: {
                      groupBy,
                      aggregations: [...aggs, { column: table.columns[0]?.name ?? "", fn: "sum" }],
                    },
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {aggs.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Add a sum / avg / count aggregation.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {aggs.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={a.fn}
                      onValueChange={(v) => {
                        const next = [...aggs];
                        next[i] = { ...next[i], fn: v as AggFn };
                        onChange({ ...config, aggregation: { groupBy, aggregations: next } });
                      }}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={a.column}
                      onValueChange={(v) => {
                        const next = [...aggs];
                        next[i] = { ...next[i], column: v };
                        onChange({ ...config, aggregation: { groupBy, aggregations: next } });
                      }}
                    >
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {table.columns.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-40 font-mono text-xs"
                      placeholder="alias (optional)"
                      value={a.as ?? ""}
                      onChange={(e) => {
                        const next = [...aggs];
                        next[i] = { ...next[i], as: e.target.value || undefined };
                        onChange({ ...config, aggregation: { groupBy, aggregations: next } });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() =>
                        onChange({
                          ...config,
                          aggregation: { groupBy, aggregations: aggs.filter((_, idx) => idx !== i) },
                        })
                      }
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Preview (after transformation)</h3>
        {preview ? <DatasetPreviewTable table={preview} /> : null}
      </div>
    </div>
  );
}
