import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Database, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { evaluatePassword } from "@/lib/password";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Pipeline" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const strength = useMemo(() => evaluatePassword(pw), [pw]);

  // Supabase puts the recovery session in the URL hash (#access_token=…&type=recovery).
  // The client picks it up automatically; we just wait until a session exists.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) setReady(true);
      else setTimeout(tick, 250);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Pipeline</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a strong password you don't use anywhere else.
        </p>

        {!ready ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying reset link…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3" noValidate>
            <div>
              <Label htmlFor="pw">New password</Label>
              <div className="relative mt-1">
                <Input id="pw" type={showPw ? "text" : "password"} required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className="pr-9" />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pw.length > 0 ? (
                <div className="mt-2">
                  <div className="flex h-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded ${i < strength.score ? strength.color : "bg-muted"}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Strength: {strength.label}</p>
                </div>
              ) : null}
            </div>
            <div>
              <Label htmlFor="cf">Confirm new password</Label>
              <Input id="cf" type={showPw ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
