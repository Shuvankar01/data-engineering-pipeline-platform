import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, Info, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { useNotifications, type NotificationCategory } from "@/components/notifications/notification-provider";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

const ICONS: Record<NotificationCategory, typeof Bell> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};
const TONE: Record<NotificationCategory, string> = {
  success: "text-success",
  info: "text-primary",
  warning: "text-warning",
  error: "text-destructive",
};

function NotificationsPage() {
  const { items, markRead, markAllRead, remove, clearAll, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<"all" | NotificationCategory | "unread">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === "unread" && n.readAt) return false;
      if (filter !== "all" && filter !== "unread" && n.category !== filter) return false;
      if (q && !`${n.title} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, q]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ""}{items.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unreadCount}>
            Mark all read
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={!items.length} className="text-destructive">
            Clear all
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notifications…"
          className="max-w-xs"
        />
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="success">Success</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="warning">Warning</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nothing here"
                description={items.length === 0 ? "You'll see pipeline events here as they happen." : "Try clearing your filter."}
              />
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((n) => {
                const Icon = ICONS[n.category];
                return (
                  <li key={n.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/40">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[n.category]}`} />
                    <div className="min-w-0 flex-1" onClick={() => markRead(n.id)}>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {!n.readAt ? <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-label="unread" /> : null}
                      </div>
                      {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(n.id)}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
