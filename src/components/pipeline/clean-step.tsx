import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { DatasetPreviewTable } from "@/components/pipeline/dataset-preview-table";
import { cleanTable } from "@/lib/pipeline/clean";
import type { CleanConfig, NullStrategy, ColumnType, Table } from "@/lib/pipeline/types";

const NULL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "Keep nulls" },
  { value: "drop", label: "Drop rows" },
  { value: "mean", label: "Fill mean" },
  { value: "median", label: "Fill median" },
  { value: "mode", label: "Fill mode" },
  { value: "constant", label: "Fill constant" },
];

export function CleanStep({
  table,
  config,
  onChange,
}: {
  table: Table | null;
  config: CleanConfig;
  onChange: (c: CleanConfig) => void;
}) {
  const preview = useMemo(() => (table ? cleanTable(table, config) : null), [table, config]);
  if (!table) return <EmptyState title="Upload a dataset first" />;

  function setStrategy(col: string, kind: string, constantValue = "") {
    const next: Record<string, NullStrategy> = { ...config.nullStrategies };
    if (kind === "none") delete next[col];
    else if (kind === "constant") next[col] = { kind: "constant", value: constantValue };
    else next[col] = { kind: kind as NullStrategy["kind"] } as NullStrategy;
    onChange({ ...config, nullStrategies: next });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="dedupe">Remove duplicates</Label>
            <Switch id="dedupe" checked={config.removeDuplicates} onCheckedChange={(v) => onChange({ ...config, removeDuplicates: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="trim">Trim whitespace</Label>
            <Switch id="trim" checked={config.trimWhitespace} onCheckedChange={(v) => onChange({ ...config, trimWhitespace: v })} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Label>Case</Label>
            <Select value={config.changeCase} onValueChange={(v) => onChange({ ...config, changeCase: v as CleanConfig["changeCase"] })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="lower">lowercase</SelectItem>
                <SelectItem value="upper">UPPERCASE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Per-column rules</h3>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-3 font-medium">Column</th>
                  <th className="py-1.5 pr-3 font-medium">Type</th>
                  <th className="py-1.5 pr-3 font-medium">Null strategy</th>
                  <th className="py-1.5 pr-3 font-medium">Constant</th>
                  <th className="py-1.5 pr-3 font-medium">Coerce to</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((c) => {
                  const s = config.nullStrategies[c.name];
                  const kind = s?.kind ?? "none";
                  const constVal = s?.kind === "constant" ? s.value : "";
                  return (
                    <tr key={c.name} className="border-t">
                      <td className="py-2 pr-3 font-mono">{c.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{c.type}</td>
                      <td className="py-2 pr-3">
                        <Select value={kind} onValueChange={(v) => setStrategy(c.name, v, constVal)}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NULL_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        {kind === "constant" ? (
                          <Input
                            className="h-8 w-32 font-mono"
                            value={constVal}
                            onChange={(e) => setStrategy(c.name, "constant", e.target.value)}
                          />
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          value={config.typeCoercions[c.name] ?? "auto"}
                          onValueChange={(v) => {
                            const next = { ...config.typeCoercions };
                            if (v === "auto") delete next[c.name];
                            else next[c.name] = v as ColumnType;
                            onChange({ ...config, typeCoercions: next });
                          }}
                        >
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Keep</SelectItem>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Preview (after cleaning)</h3>
        {preview ? <DatasetPreviewTable table={preview} /> : null}
      </div>
    </div>
  );
}
