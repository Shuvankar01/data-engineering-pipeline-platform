import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  GitBranch,
  LayoutDashboard,
  Plus,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { listPipelines } from "@/lib/pipelines.functions";
import { useTheme } from "@/components/theme/theme-provider";

/**
 * Global Cmd/Ctrl+K command palette.
 * Navigation, theme switching, and quick lookup over the user's pipelines.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  // Open on Cmd/Ctrl+K, and on standalone "/" when no input is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const listFn = useServerFn(listPipelines);
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines-search"],
    queryFn: () => listFn(),
    enabled: open,
    staleTime: 30_000,
  });

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pipelines, go to…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go(() => navigate({ to: "/dashboard" }))}>
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/pipelines" }))}>
            <GitBranch className="h-4 w-4" /> Pipelines
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/executions" }))}>
            <Activity className="h-4 w-4" /> Execution history
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/notifications" }))}>
            <Activity className="h-4 w-4" /> Notifications
          </CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/settings" }))}>
            <SettingsIcon className="h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go(() => navigate({ to: "/pipelines" }))}>
            <Plus className="h-4 w-4" /> New pipeline
          </CommandItem>
          <CommandItem onSelect={() => go(() => setTheme("light"))}>
            <Sun className="h-4 w-4" /> Theme: Light
          </CommandItem>
          <CommandItem onSelect={() => go(() => setTheme("dark"))}>
            <Sun className="h-4 w-4" /> Theme: Dark
          </CommandItem>
          <CommandItem onSelect={() => go(() => setTheme("system"))}>
            <Sun className="h-4 w-4" /> Theme: System
          </CommandItem>
        </CommandGroup>
        {pipelines && pipelines.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Pipelines">
              {pipelines.slice(0, 8).map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => go(() => navigate({ to: "/pipelines/$id", params: { id: p.id } }))}
                  value={`${p.name} ${p.description ?? ""}`}
                >
                  <GitBranch className="h-4 w-4" />
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
