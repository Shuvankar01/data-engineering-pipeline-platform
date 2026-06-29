/**
 * Seed a first-time user with a "Customer Orders Demo" pipeline.
 * Idempotent: runs only if the user has zero pipelines.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SAMPLE_ORDERS_CSV } from "./sample-data";

export const seedDemoIfNeeded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("pipelines")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { seeded: false };

    // 1) Pipeline
    const { data: pipeline, error: pErr } = await context.supabase
      .from("pipelines")
      .insert({
        user_id: context.userId,
        name: "Customer Orders Demo",
        description:
          "A sample retail orders dataset, pre-configured with validation, cleaning, and aggregation.",
        status: "success",
      })
      .select("*")
      .single();
    if (pErr || !pipeline) throw new Error(pErr?.message ?? "seed failed");

    // 2) Upload sample CSV to raw bucket via admin (bypass RLS for clean seeding)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const csvBytes = new TextEncoder().encode(SAMPLE_ORDERS_CSV);
    const storagePath = `${context.userId}/${pipeline.id}/sample-orders.csv`;
    await supabaseAdmin.storage
      .from("raw-datasets")
      .upload(storagePath, csvBytes, { contentType: "text/csv", upsert: true });

    // 3) Source dataset row
    const sampleColumns = [
      { name: "order_id", type: "number" },
      { name: "customer_email", type: "string" },
      { name: "country", type: "string" },
      { name: "product", type: "string" },
      { name: "quantity", type: "number" },
      { name: "unit_price", type: "number" },
      { name: "order_date", type: "date" },
      { name: "status", type: "string" },
    ];
    await context.supabase.from("datasets").insert({
      pipeline_id: pipeline.id,
      user_id: context.userId,
      kind: "source",
      filename: "sample-orders.csv",
      storage_path: storagePath,
      mime: "text/csv",
      row_count: 21,
      column_count: 8,
      schema: sampleColumns,
    });

    // 4) Pre-configured steps
    await context.supabase.from("pipeline_steps").insert([
      {
        pipeline_id: pipeline.id,
        user_id: context.userId,
        kind: "validate",
        order_index: 0,
        config: {
          checkMissing: true,
          checkDuplicates: true,
          formatChecks: [{ column: "customer_email", check: "email" }],
        },
      },
      {
        pipeline_id: pipeline.id,
        user_id: context.userId,
        kind: "clean",
        order_index: 1,
        config: {
          removeDuplicates: true,
          trimWhitespace: true,
          changeCase: "lower",
          nullStrategies: {
            customer_email: { kind: "constant", value: "unknown@example.com" },
            unit_price: { kind: "mean" },
          },
          typeCoercions: {},
        },
      },
      {
        pipeline_id: pipeline.id,
        user_id: context.userId,
        kind: "transform",
        order_index: 2,
        config: {
          renames: {},
          filters: [{ column: "status", op: "eq", value: "paid" }],
          aggregation: {
            groupBy: ["country", "product"],
            aggregations: [
              { column: "quantity", fn: "sum", as: "units_sold" },
              { column: "unit_price", fn: "avg", as: "avg_price" },
            ],
          },
        },
      },
    ]);

    // 5) One completed execution so charts render immediately
    const now = new Date().toISOString();
    await context.supabase.from("executions").insert({
      pipeline_id: pipeline.id,
      user_id: context.userId,
      status: "success",
      records_in: 21,
      records_out: 8,
      duration_ms: 42,
      summary: {
        steps: [
          { kind: "validate", recordsIn: 21, recordsOut: 21, durationMs: 5, notes: ["1 duplicate row detected"] },
          { kind: "clean", recordsIn: 21, recordsOut: 20, durationMs: 12, notes: ["removed 1 row", "deduplicated"] },
          { kind: "transform", recordsIn: 20, recordsOut: 8, durationMs: 25, notes: ["applied 1 filter", "grouped by country, product"] },
        ],
        totalDurationMs: 42,
        recordsIn: 21,
        recordsOut: 8,
      },
      started_at: now,
      finished_at: now,
    });

    return { seeded: true, pipelineId: pipeline.id };
  });
