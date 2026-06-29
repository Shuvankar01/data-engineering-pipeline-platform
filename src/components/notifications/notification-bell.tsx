import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type NotificationCategory } from "./notification-provider";

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

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead} disabled={!unreadCount}>
              Mark all read
            </Button>
          </div>
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
              <Bell className="mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New activity will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.slice(0, 10).map((n) => {
                const Icon = ICONS[n.category];
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/50"
                    >
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[n.category]}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{n.title}</p>
                          {!n.readAt ? <Badge className="h-1.5 w-1.5 rounded-full p-0" /> : null}
                        </div>
                        {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p> : null}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link to="/notifications">View all</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive" onClick={clearAll} disabled={!items.length}>
            Clear all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
