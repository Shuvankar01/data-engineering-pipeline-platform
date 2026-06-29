import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * List recent executions for the signed-in user, joined with pipeline name.
 * RLS scopes results automatically.
 */
export const listExecutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("executions")
      .select("*, pipelines(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((e) => ({
      ...e,
      pipeline_name: (e as { pipelines?: { name?: string } | null }).pipelines?.name ?? null,
    }));
  });
