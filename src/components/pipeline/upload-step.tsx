import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatasetPreviewTable } from "@/components/pipeline/dataset-preview-table";
import { EmptyState } from "@/components/common/empty-state";
import { parseFile } from "@/lib/parse";
import { validateUploadedFile, formatBytes } from "@/lib/file-validation";
import { supabase } from "@/integrations/supabase/client";
import { uploadRawFile } from "@/lib/storage";
import { recordDataset } from "@/lib/pipelines.functions";
import type { Table } from "@/lib/pipeline/types";
import type { Tables } from "@/integrations/supabase/types";

export function UploadStep({
  pipelineId,
  existingDataset,
  sourceTable,
  onTableReady,
  onUploaded,
}: {
  pipelineId: string;
  existingDataset: Tables<"datasets"> | null;
  sourceTable: Table | null;
  onTableReady: (t: Table) => void;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const recordFn = useServerFn(recordDataset);

  async function handleFiles(files: FileList | null) {
    if (!files || !files[0]) return;
    setBusy(true);
    try {
      const { file, kind } = validateUploadedFile(files[0]);
      const table = await parseFile(file, kind);
      onTableReady(table);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in.");

      const { path } = await uploadRawFile(userId, pipelineId, file);

      await recordFn({
        data: {
          pipelineId,
          kind: "source",
          filename: file.name,
          storagePath: path,
          mime: file.type || undefined,
          rowCount: table.rows.length,
          columnCount: table.columns.length,
          schema: table.columns.map((c) => ({ name: c.name, type: c.type })),
        },
      });
      toast.success(`Uploaded ${file.name} (${formatBytes(file.size)})`);
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent
          className="space-y-3 p-8 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Drag a file here, or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV, JSON, or XLSX up to 20 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Choose file
          </Button>
          {existingDataset ? (
            <p className="pt-2 text-xs text-muted-foreground">
              Current source: <span className="font-mono">{existingDataset.filename}</span>{" "}
              · {existingDataset.row_count.toLocaleString()} rows ·{" "}
              {existingDataset.column_count} columns
            </p>
          ) : null}
        </CardContent>
      </Card>

      {sourceTable ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Preview</h3>
          <DatasetPreviewTable table={sourceTable} />
        </div>
      ) : (
        <EmptyState title="No dataset uploaded yet" description="Upload a file to see a preview here." />
      )}
    </div>
  );
}
