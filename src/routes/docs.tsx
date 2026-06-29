import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Database, FileCheck, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — Pipeline" },
      { name: "description", content: "Learn how to upload, validate, clean, transform, and export datasets with Pipeline." },
    ],
  }),
  component: DocsPage,
});

const SECTIONS = [
  { icon: BookOpen, title: "Getting started", body: "Create an account, then open Pipelines → New pipeline. Upload a CSV, JSON, or Excel file (≤ 20 MB) to begin." },
  { icon: FileCheck, title: "Validation", body: "Detect missing values, duplicate rows, and format errors (email, number, date, regex). Validation is non-destructive — the dataset is unchanged." },
  { icon: Sparkles, title: "Cleaning", body: "Drop or fill nulls (mean / median / mode / constant), deduplicate, trim whitespace, normalize case, and coerce column types." },
  { icon: Workflow, title: "Transformation", body: "Rename columns, apply filter chains, and aggregate with group-by (sum / avg / count)." },
];

function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Database className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Pipeline</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-3 text-muted-foreground">Everything you need to ship your first pipeline.</p>

        <div className="mt-12 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          Full guides, API reference, and screenshots are in the project README.
        </div>
      </main>
    </div>
  );
}
