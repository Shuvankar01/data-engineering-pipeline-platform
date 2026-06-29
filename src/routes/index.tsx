import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileCheck,
  Github,
  Lock,
  Shield,
  Sparkles,
  Upload,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pipeline — Build production-ready data pipelines without writing code" },
      {
        name: "description",
        content:
          "Upload CSV, JSON, or Excel datasets. Validate, clean, transform, analyze, and export — all securely in your browser.",
      },
      { property: "og:title", content: "Pipeline — Data engineering, made simple" },
      {
        property: "og:description",
        content:
          "A self-serve data engineering platform with guided workflows, in-browser processing, and one-click export.",
      },
    ],
  }),
  component: LandingPage,
});

const WORKFLOW = [
  { label: "Upload", icon: Upload, hint: "CSV, JSON, Excel · ≤ 20 MB" },
  { label: "Validate", icon: FileCheck, hint: "Missing · duplicates · format" },
  { label: "Clean", icon: Sparkles, hint: "Trim · dedupe · fill nulls" },
  { label: "Transform", icon: Workflow, hint: "Rename · filter · group-by" },
  { label: "Analytics", icon: BarChart3, hint: "Histograms · KPIs · trends" },
  { label: "Export", icon: Download, hint: "CSV · JSON · XLSX" },
];

const FEATURES = [
  { icon: Zap, title: "In-browser processing", body: "Datasets never leave your browser. No server-side compute, no cold starts." },
  { icon: Shield, title: "Secure authentication", body: "Email and password sign-in, with private per-user workspaces." },
  { icon: Lock, title: "Private storage", body: "Uploads land in private buckets behind signed URLs and row-level security." },
  { icon: CheckCircle2, title: "Execution tracking", body: "Every run is logged with timing, record counts, and a JSON summary." },
  { icon: BarChart3, title: "Built-in analytics", body: "Histograms, top-categories, null heatmaps, and KPI cards out of the box." },
  { icon: Download, title: "One-click export", body: "Save processed datasets back to your workspace as CSV, JSON, or XLSX." },
];

const STATS = [
  { value: "6", label: "Workflow stages" },
  { value: "3", label: "File formats" },
  { value: "20MB", label: "Max upload" },
  { value: "0ms", label: "Server processing" },
];

const FAQ = [
  { q: "Where does my data go?", a: "Files you upload are parsed in your browser. Only metadata and your processed export are persisted to your private workspace bucket — protected by row-level security." },
  { q: "Which file formats are supported?", a: "CSV, JSON, and Excel (.xlsx). Files up to 20 MB are accepted; larger files are rejected before parsing." },
  { q: "Can I share pipelines with my team?", a: "Today every pipeline is scoped to its owner. Multi-tenant workspaces are on the roadmap." },
  { q: "Is there a free tier?", a: "Yes — the entire platform is currently free for individual use." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Database className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Pipeline</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <Link to="/docs" className="hover:text-foreground">Documentation</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              <Github className="h-3.5 w-3.5" /> GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-32 -z-10 mx-auto h-[600px] max-w-5xl bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15%),transparent_70%)]" />
          <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 lg:pt-28 lg:pb-20">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> v1 · Now in preview
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Build production-ready data pipelines without writing code.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Upload CSV, JSON, and Excel datasets. Validate quality, clean inconsistencies,
                transform records, explore analytics, and export results — all securely in your browser.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Get started <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how">View demo</a>
                </Button>
              </div>
            </div>

            {/* Animated workflow illustration */}
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {WORKFLOW.map((s, i) => (
                    <div
                      key={s.label}
                      className="group relative rounded-lg border bg-background/60 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                      style={{ animation: `pulse-soft 3s ${i * 0.25}s ease-in-out infinite` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <s.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold">{s.label}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">{s.hint}</p>
                      {i < WORKFLOW.length - 1 ? (
                        <div className="absolute right-[-10px] top-1/2 hidden -translate-y-1/2 text-muted-foreground lg:block">
                          →
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <style>{`
                  @keyframes pulse-soft {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
                    50% { box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 10%, transparent); }
                  }
                `}</style>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-6 py-10 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to ship clean data.</h2>
            <p className="mt-3 text-sm text-muted-foreground">A focused toolkit for the most common data engineering tasks — without the orchestration overhead.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From raw file to clean dataset in minutes.</h2>
            </div>
            <ol className="relative mx-auto mt-12 max-w-3xl border-l">
              {WORKFLOW.map((s, i) => (
                <li key={s.label} className="ml-6 pb-8 last:pb-0">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold">{s.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.hint}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Screenshots placeholder */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Product</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Made for clarity, built for speed.</h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {["Dashboard overview", "Pipeline workflow"].map((label) => (
              <div
                key={label}
                className="aspect-[16/10] overflow-hidden rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-6"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive/60" />
                    <span className="h-2 w-2 rounded-full bg-warning/80" />
                    <span className="h-2 w-2 rounded-full bg-success/70" />
                  </div>
                  <div className="mt-3 flex flex-1 items-center justify-center">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-widest text-primary">FAQ</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions.</h2>
            </div>
            <Accordion type="single" collapsible className="mt-10">
              {FAQ.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-10 text-center sm:p-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ship cleaner data, faster.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Sign up for a free workspace and run your first pipeline in under five minutes.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link to="/auth">
                  Get started <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground">
              <Database className="h-3 w-3" />
            </div>
            <span>© 2026 Pipeline · Self-serve data engineering</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/docs" className="hover:text-foreground">Documentation</Link>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
