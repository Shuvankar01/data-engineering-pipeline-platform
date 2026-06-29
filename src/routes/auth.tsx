import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Check, Database, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { evaluatePassword } from "@/lib/password";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Pipeline" },
      { name: "description", content: "Sign in to the Pipeline data engineering workspace." },
    ],
  }),
  component: AuthPage,
});

const REMEMBER_KEY = "pipeline-remember-email";

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  const strength = useMemo(() => evaluatePassword(password), [password]);
  const passwordsMatch = mode === "signin" || (confirm.length > 0 && confirm === password);
  const passwordLongEnough = password.length >= 8;

  // Restore remembered email and short-circuit to dashboard if already signed in.
  useEffect(() => {
    try {
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem(REMEMBER_KEY) : null;
      if (saved) setEmail(saved);
    } catch {
      /* ignore */
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "signup" && !passwordLongEnough) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (mode === "signup" && !passwordsMatch) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        // Email confirmation is disabled on the project — signUp returns a session and we go straight to the dashboard.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Welcome to Pipeline.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      // Persist or clear remembered email based on the checkbox (sign-in only).
      try {
        if (typeof localStorage !== "undefined") {
          if (mode === "signin" && remember) localStorage.setItem(REMEMBER_KEY, email);
          else if (mode === "signin") localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        /* ignore quota */
      }
      await router.invalidate();
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(friendlyAuthError(msg));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Pipeline</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to your workspace" : "Create your workspace"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Use your email and password to continue."
            : "Start building your first data pipeline in seconds."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" ? (
                <Link to="/auth/forgot" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              ) : null}
            </div>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                required
                minLength={mode === "signup" ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                className="pr-9"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signup" && password.length > 0 ? (
              <div className="mt-2">
                <div className="flex h-1 gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${i < strength.score ? strength.color : "bg-muted"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Strength: {strength.label}</p>
              </div>
            ) : null}
          </div>

          {mode === "signup" && (
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="pr-9"
                  autoComplete="new-password"
                />
                {confirm.length > 0 ? (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="h-4 w-4 text-success" aria-label="Passwords match" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" aria-label="Passwords don't match" />
                    )}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {mode === "signin" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
                aria-label="Remember my email"
              />
              Remember me on this device
            </label>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-primary hover:underline"
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

/** Map a few common Supabase errors to friendlier copy. */
function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("already registered") || m.includes("user already"))
    return "That email already has an account. Try signing in.";
  if (m.includes("rate limit")) return "Too many attempts. Please try again in a minute.";
  return msg;
}
