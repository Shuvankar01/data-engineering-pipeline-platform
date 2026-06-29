/**
 * Strict client-side guard for uploaded files.
 * Checks extension, MIME, and byte size BEFORE any parsing happens.
 */

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export type SupportedKind = "csv" | "json" | "xlsx";

const EXT_MAP: Record<string, SupportedKind> = {
  csv: "csv",
  json: "json",
  xls: "xlsx",
  xlsx: "xlsx",
};

const MIME_MAP: Record<string, SupportedKind> = {
  "text/csv": "csv",
  "application/csv": "csv",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/json": "json",
  "text/json": "json",
};

export interface ValidatedFile {
  file: File;
  kind: SupportedKind;
}

export function validateUploadedFile(file: File): ValidatedFile {
  if (file.size === 0) throw new Error("File is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is larger than ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)} MB. Please upload a smaller dataset.`,
    );
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt = EXT_MAP[ext];
  const byMime = file.type ? MIME_MAP[file.type] : undefined;
  const kind = byExt ?? byMime;
  if (!kind) {
    throw new Error("Unsupported file type. Please upload a CSV, JSON, or XLSX file.");
  }
  return { file, kind };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
