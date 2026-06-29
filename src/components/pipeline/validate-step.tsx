import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { validateTable } from "@/lib/pipeline/validate";
import type { Table, ValidateConfig, FormatCheck } from "@/lib/pipeline/types";

export function ValidateStep({
  table,
  config,
  onChange,
}: {
  table: Table | null;
  config: ValidateConfig;
  onChange: (c: ValidateConfig) => void;
}) {
  const report = useMemo(() => (table ? validateTable(table, config) : null), [table, config]);
  if (!table) return <EmptyState title="Upload a dataset first" />;

  const totalMissing = report ? Object.values(report.missingByColumn).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="missing">Check for missing values</Label>
            <Switch id="missing" checked={config.checkMissing} onCheckedChange={(v) => onChange({ ...config, checkMissing: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="dupes">Check for duplicate rows</Label>
            <Switch id="dupes" checked={config.checkDuplicates} onCheckedChange={(v) => onChange({ ...config, checkDuplicates: v })} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Format checks</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...config,
                    formatChecks: [
                      ...config.formatChecks,
                      { column: table.columns[0]?.name ?? "", check: "email" },
                    ],
                  })
                }
              >
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {config.formatChecks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No format checks. Add one to validate emails, numbers, dates, or regex patterns.</p>
            ) : (
              <div className="space-y-2">
                {config.formatChecks.map((fc, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={fc.column}
                      onValueChange={(v) => {
                        const next = [...config.formatChecks];
                        next[i] = { ...next[i], column: v };
                        onChange({ ...config, formatChecks: next });
                      }}
                    >
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {table.columns.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={fc.check}
                      onValueChange={(v) => {
                        const next = [...config.formatChecks];
                        next[i] = { ...next[i], check: v as FormatCheck };
                        onChange({ ...config, formatChecks: next });
                      }}
                    >
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="regex">Regex</SelectItem>
                      </SelectContent>
                    </Select>
                    {fc.check === "regex" ? (
                      <Input
                        className="w-48 font-mono text-xs"
                        placeholder="^[A-Z]+$"
                        value={fc.pattern ?? ""}
                        onChange={(e) => {
                          const next = [...config.formatChecks];
                          next[i] = { ...next[i], pattern: e.target.value };
                          onChange({ ...config, formatChecks: next });
                        }}
                      />
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-muted-foreground"
                      onClick={() =>
                        onChange({ ...config, formatChecks: config.formatChecks.filter((_, idx) => idx !== i) })
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

      <div className="grid gap-3 sm:grid-cols-3">
        <ReportCard label="Missing cells" value={totalMissing.toLocaleString()} />
        <ReportCard label="Duplicate rows" value={report?.duplicateRowCount ?? 0} />
        <ReportCard label="Format failures" value={report?.formatFailures.reduce((s, f) => s + f.failed, 0) ?? 0} />
      </div>

      {report && totalMissing > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Missing by column</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {Object.entries(report.missingByColumn)
                .filter(([, n]) => n > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([col, n]) => (
                  <div key={col} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs">
                    <span className="truncate font-mono">{col}</span>
                    <span className="font-semibold text-warning-foreground">{n}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report && report.formatFailures.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Format failures</h3>
            <ul className="space-y-1.5 text-xs">
              {report.formatFailures.map((f, i) => (
                <li key={i} className="flex justify-between rounded-md border px-3 py-1.5">
                  <span className="font-mono">{f.column}</span>
                  <span className="text-muted-foreground">{f.check}: <span className="font-semibold text-destructive">{f.failed} failed</span></span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="p-5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}
