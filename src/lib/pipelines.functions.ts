import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";


/** Create a new pipeline owned by the signed-in user. */
export const createPipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(500).optional() }),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("pipelines")
      .insert({ name: data.name, description: data.description ?? null, user_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const renamePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(120) }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pipelines")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator( z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("pipelines").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Clone a pipeline (name + description + steps). Datasets and executions are
 * intentionally NOT copied — the new pipeline starts with a clean run history.
 */
export const clonePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator( z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: src, error: sErr } = await context.supabase
      .from("pipelines")
      .select("name, description")
      .eq("id", data.id)
      .single();
    if (sErr) throw new Error(sErr.message);

    const { data: created, error: cErr } = await context.supabase
      .from("pipelines")
      .insert({ name: `${src.name} (copy)`, description: src.description, user_id: context.userId })
      .select("*")
      .single();
    if (cErr) throw new Error(cErr.message);

    const { data: steps } = await context.supabase
      .from("pipeline_steps")
      .select("kind, config, order_index")
      .eq("pipeline_id", data.id)
      .order("order_index");

    if (steps && steps.length > 0) {
      const rows = steps.map((s) => ({
        pipeline_id: created.id,
        user_id: context.userId,
        kind: s.kind,
        config: s.config,
        order_index: s.order_index,
      }));
      const { error: iErr } = await context.supabase.from("pipeline_steps").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return created;
  });

export const listPipelines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("pipelines")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator( z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const [{ data: pipeline, error: pErr }, { data: steps }, { data: datasets }, { data: executions }] =
      await Promise.all([
        context.supabase.from("pipelines").select("*").eq("id", data.id).single(),
        context.supabase
          .from("pipeline_steps")
          .select("*")
          .eq("pipeline_id", data.id)
          .order("order_index"),
        context.supabase
          .from("datasets")
          .select("*")
          .eq("pipeline_id", data.id)
          .order("created_at", { ascending: false }),
        context.supabase
          .from("executions")
          .select("*")
          .eq("pipeline_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
    if (pErr) throw new Error(pErr.message);
    return {
      pipeline,
      steps: steps ?? [],
      datasets: datasets ?? [],
      executions: executions ?? [],
    };
  });

/** Replace the full step list for a pipeline (small N, simplest semantics). */
export const saveSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z
      .object({
        pipelineId: z.string().uuid(),
        steps: z.array(
          z.object({
            kind: z.enum(["validate", "clean", "transform"]),
            config: z.record(z.string(), z.unknown()),
            order_index: z.number().int().nonnegative(),
          }),
        ),
      }),
  )
  .handler(async ({ data, context }) => {
    const { error: dErr } = await context.supabase
      .from("pipeline_steps")
      .delete()
      .eq("pipeline_id", data.pipelineId);
    if (dErr) throw new Error(dErr.message);
    if (data.steps.length) {
      const rows = data.steps.map((s) => ({
        pipeline_id: data.pipelineId,
        user_id: context.userId,
        kind: s.kind,
        config: s.config as Json,
        order_index: s.order_index,
      }));
      const { error: iErr } = await context.supabase.from("pipeline_steps").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }

    return { ok: true };
  });

/** Record a new execution after the in-browser engine finishes. */
export const recordExecution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z
      .object({
        pipelineId: z.string().uuid(),
        status: z.enum(["success", "failed"]),
        recordsIn: z.number().int().nonnegative(),
        recordsOut: z.number().int().nonnegative(),
        durationMs: z.number().int().nonnegative(),
        error: z.string().nullable().optional(),
        summary: z.record(z.string(), z.unknown()),
      }),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("executions")
      .insert({
        pipeline_id: data.pipelineId,
        user_id: context.userId,
        status: data.status,
        records_in: data.recordsIn,
        records_out: data.recordsOut,
        duration_ms: data.durationMs,
        error: data.error ?? null,
        summary: data.summary as Json,
        started_at: now,
        finished_at: now,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("pipelines")
      .update({ status: data.status })
      .eq("id", data.pipelineId);
    return row;
  });

/** Save uploaded dataset metadata (file already pushed to Storage client-side). */
export const recordDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z
      .object({
        pipelineId: z.string().uuid(),
        kind: z.enum(["source", "processed"]),
        filename: z.string(),
        storagePath: z.string(),
        mime: z.string().optional(),
        rowCount: z.number().int().nonnegative(),
        columnCount: z.number().int().nonnegative(),
        schema: z.array(z.object({ name: z.string(), type: z.string() })),
      }),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("datasets")
      .insert({
        pipeline_id: data.pipelineId,
        user_id: context.userId,
        kind: data.kind,
        filename: data.filename,
        storage_path: data.storagePath,
        mime: data.mime ?? null,
        row_count: data.rowCount,
        column_count: data.columnCount,
        schema: data.schema,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Aggregate dashboard stats for the signed-in user. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: pipelineCount }, { data: execs }, { data: datasets }] = await Promise.all([
      context.supabase.from("pipelines").select("id", { count: "exact", head: true }),
      context.supabase
        .from("executions")
        .select("status, records_out, records_in, duration_ms, created_at, pipeline_id")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("datasets")
        .select("filename, row_count, column_count, created_at, kind")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const all = execs ?? [];
    const total = all.length;
    const success = all.filter((e) => e.status === "success").length;
    const recordsProcessed = all.reduce((s, e) => s + (e.records_out ?? 0), 0);
    const avgDuration = total
      ? Math.round(all.reduce((s, e) => s + (e.duration_ms ?? 0), 0) / total)
      : 0;
    const largest = (datasets ?? []).reduce<{ filename: string; row_count: number } | null>(
      (best, d) => (!best || (d.row_count ?? 0) > best.row_count ? { filename: d.filename, row_count: d.row_count ?? 0 } : best),
      null,
    );
    const recentUploads = (datasets ?? []).filter((d) => d.kind === "source").slice(0, 5);

    // Last-14-day success trend (one bucket per day).
    const trend: { date: string; success: number; failed: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, success: 0, failed: 0 });
    }
    for (const e of all) {
      const key = (e.created_at ?? "").slice(0, 10);
      const bucket = trend.find((t) => t.date === key);
      if (!bucket) continue;
      if (e.status === "success") bucket.success++;
      else if (e.status === "failed") bucket.failed++;
    }

    return {
      pipelineCount: pipelineCount ?? 0,
      executionCount: total,
      recordsProcessed,
      successRate: total ? Math.round((success / total) * 100) : 0,
      avgDurationMs: avgDuration,
      largestDataset: largest,
      recentUploads,
      trend,
      recent: all.slice(0, 8),
    };
  });
