import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, LogOut, ShieldAlert, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const DENSITY_KEY = "pipeline-density";
type Density = "comfortable" | "compact";

function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setFullName((data.user?.user_metadata?.full_name as string) ?? "");
    });
  }, []);

  async function saveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, appearance, and security.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="danger">Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your name is shown across the workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email ?? ""} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5"><AppearancePanel /></TabsContent>
        <TabsContent value="notifications" className="mt-5"><NotificationsPanel /></TabsContent>
        <TabsContent value="security" className="mt-5"><SecurityPanel /></TabsContent>
        <TabsContent value="preferences" className="mt-5"><PreferencesPanel /></TabsContent>
        <TabsContent value="danger" className="mt-5"><DangerPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? (localStorage.getItem(DENSITY_KEY) as Density | null) : null;
    if (stored) setDensity(stored);
  }, []);

  function updateDensity(next: Density) {
    setDensity(next);
    if (typeof localStorage !== "undefined") localStorage.setItem(DENSITY_KEY, next);
  }

  return (
    <Card>
      <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Theme, density, and language.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Theme</Label>
          <div className="mt-2 flex items-center gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
            <div className="ml-auto"><ThemeToggle /></div>
          </div>
        </div>
        <Separator />
        <div>
          <Label>Density</Label>
          <div className="mt-2 flex gap-2">
            <Button variant={density === "comfortable" ? "default" : "outline"} size="sm" onClick={() => updateDensity("comfortable")}>Comfortable</Button>
            <Button variant={density === "compact" ? "default" : "outline"} size="sm" onClick={() => updateDensity("compact")}>Compact</Button>
          </div>
        </div>
        <Separator />
        <div>
          <Label htmlFor="lang">Language</Label>
          <Input id="lang" value="English (US)" disabled className="mt-1" />
          <p className="mt-1 text-xs text-muted-foreground">Additional languages are on the roadmap.</p>
        </div>
      </CardContent>
    </Card>
  );
}

const PREFS_KEY = "pipeline-notif-prefs";
interface NotifPrefs {
  emailCompletion: boolean;
  emailFailure: boolean;
  emailWeekly: boolean;
  browserCompletion: boolean;
  browserFailure: boolean;
}
const DEFAULT_PREFS: NotifPrefs = {
  emailCompletion: true, emailFailure: true, emailWeekly: false,
  browserCompletion: true, browserFailure: true,
};

function NotificationsPanel() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PREFS_KEY) : null;
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as NotifPrefs) });
    } catch { /* ignore */ }
  }, []);
  function update<K extends keyof NotifPrefs>(k: K, v: NotifPrefs[K]) {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      if (typeof localStorage !== "undefined") localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }
  const Row = ({ id, label, k }: { id: string; label: string; k: keyof NotifPrefs }) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
      <Switch id={id} checked={prefs[k]} onCheckedChange={(v) => update(k, v)} />
    </div>
  );
  return (
    <Card>
      <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose what to receive.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
          <div className="space-y-3">
            <Row id="e1" label="Pipeline completion" k="emailCompletion" />
            <Row id="e2" label="Pipeline failure" k="emailFailure" />
            <Row id="e3" label="Weekly summary" k="emailWeekly" />
          </div>
        </div>
        <Separator />
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browser</p>
          <div className="space-y-3">
            <Row id="b1" label="Pipeline completion" k="browserCompletion" />
            <Row id="b2" label="Pipeline failure" k="browserFailure" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityPanel() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  async function changePassword() {
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPw(""); }
  }

  async function signOutAll() {
    setSigningOutAll(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setSigningOutAll(false);
    if (error) toast.error(error.message);
    else toast.success("Signed out of all sessions");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Security</CardTitle><CardDescription>Manage your password and active sessions.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="newpw">Change password</Label>
          <div className="mt-1 flex gap-2">
            <Input id="newpw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" />
            <Button onClick={changePassword} disabled={busy || pw.length < 8}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Separator />
        <div>
          <Label>Sessions</Label>
          <p className="mt-1 text-xs text-muted-foreground">Sign out everywhere if you suspect your account is compromised.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={signOutAll} disabled={signingOutAll}>
            {signingOutAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Sign out all sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE_KEY = "pipeline-page-size";
function PreferencesPanel() {
  const [pageSize, setPageSize] = useState<string>("50");
  useEffect(() => {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(PAGE_SIZE_KEY) : null;
    if (v) setPageSize(v);
  }, []);
  function update(v: string) {
    setPageSize(v);
    if (typeof localStorage !== "undefined") localStorage.setItem(PAGE_SIZE_KEY, v);
  }
  return (
    <Card>
      <CardHeader><CardTitle>Preferences</CardTitle><CardDescription>Defaults applied across the workspace.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="ps">Preview page size</Label>
          <Input id="ps" type="number" min={10} max={500} value={pageSize} onChange={(e) => update(e.target.value)} className="mt-1 max-w-[120px]" />
        </div>
      </CardContent>
    </Card>
  );
}

function DangerPanel() {
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-4 w-4" /> Danger zone
        </CardTitle>
        <CardDescription>Irreversible account actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Account deletion requires an administrator. Contact support to remove your data permanently.
                Your sessions can be ended now from the Security tab.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast.message("Request received — we'll be in touch.")}>
                Request deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
