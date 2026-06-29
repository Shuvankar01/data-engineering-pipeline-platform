import type { Table } from "@/lib/pipeline/types";

export function DatasetPreviewTable({
  table,
  maxRows = 50,
}: {
  table: Table;
  maxRows?: number;
}) {
  if (!table.columns.length) {
    return (
      <p className="rounded-md border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
        No columns to display.
      </p>
    );
  }
  const rows = table.rows.slice(0, maxRows);
  return (
    <div className="overflow-auto rounded-md border bg-card">
      <table className="w-full text-xs">
        <thead className="border-b bg-muted/40">
          <tr>
            {table.columns.map((c) => (
              <th
                key={c.name}
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-foreground"
              >
                <div className="font-mono text-[11px]">{c.name}</div>
                <div className="text-[10px] font-normal text-muted-foreground">{c.type}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-b-0 hover:bg-muted/20">
              {table.columns.map((c) => (
                <td key={c.name} className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px]">
                  {r[c.name] === null || r[c.name] === undefined ? (
                    <span className="text-muted-foreground/60">∅</span>
                  ) : (
                    String(r[c.name])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
        Showing {rows.length} of {table.rows.length} rows
      </div>
    </div>
  );
}
