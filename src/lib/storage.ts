/**
 * Storage helpers — keep paths/URLs out of UI code.
 * Paths are scoped per user: `<user_id>/<pipeline_id>/<filename>`.
 */

import { supabase } from "@/integrations/supabase/client";

const RAW = "raw-datasets";
const PROCESSED = "processed-datasets";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadRawFile(
  userId: string,
  pipelineId: string,
  file: File,
): Promise<{ path: string }> {
  const path = `${userId}/${pipelineId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(RAW).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return { path };
}

export async function uploadProcessedBlob(
  userId: string,
  pipelineId: string,
  filename: string,
  blob: Blob,
): Promise<{ path: string }> {
  const path = `${userId}/${pipelineId}/${Date.now()}-${safeName(filename)}`;
  const { error } = await supabase.storage.from(PROCESSED).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || undefined,
  });
  if (error) throw new Error(error.message);
  return { path };
}

export async function createSignedDownload(
  bucket: "raw" | "processed",
  path: string,
  expiresIn = 60 * 10,
): Promise<string> {
  const b = bucket === "raw" ? RAW : PROCESSED;
  const { data, error } = await supabase.storage
    .from(b)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message ?? "Could not sign URL");
  return data.signedUrl;
}

export async function downloadRawFile(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(RAW).download(path);
  if (error || !data) throw new Error(error?.message ?? "Download failed");
  return data;
}
