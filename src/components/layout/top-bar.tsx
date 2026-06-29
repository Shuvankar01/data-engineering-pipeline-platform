import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function TopBar({ title }: { title?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // Trigger the global palette by dispatching the same shortcut it listens for.
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        {title ? <h1 className="text-sm font-medium text-foreground">{title}</h1> : null}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={openPalette}
          className="hidden h-8 gap-1.5 text-xs text-muted-foreground sm:inline-flex"
          aria-label="Open command palette"
        >
          <Command className="h-3 w-3" /> Search
          <kbd className="ml-2 rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
        </Button>
        {email ? (
          <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>
        ) : null}
        <NotificationBell />
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={signOut} className="h-8">
          <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </header>
  );
}
