import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Local-state notification center. Notifications are persisted in localStorage
 * (per browser) — no backend table required. Server-backed notifications are
 * easy to swap in later by replacing the storage hook below.
 */
export type NotificationCategory = "success" | "info" | "warning" | "error";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationContextValue {
  items: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "createdAt" | "readAt">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "pipeline-notifications";
const EVENT = "pipeline:notify";
const MAX_ITEMS = 50;

const Ctx = createContext<NotificationContextValue | undefined>(undefined);

function makeId(): string {
  // Crypto-safe in browsers; falls back to Math.random in older runtimes.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/**
 * Fire-and-forget notify helper for code that lives outside React context
 * (engine modules, server-fn callers, etc.). Picked up by the provider via
 * a window event so producers stay decoupled from the UI tree.
 */
export function notify(
  category: NotificationCategory,
  title: string,
  body?: string,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { category, title, body } }));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw) as AppNotification[]);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items]);

  const push = useCallback<NotificationContextValue["push"]>((n) => {
    setItems((prev) =>
      [{ ...n, id: makeId(), createdAt: new Date().toISOString(), readAt: null }, ...prev].slice(0, MAX_ITEMS),
    );
  }, []);

  // Bridge for the imperative `notify()` helper (window CustomEvent).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ category: NotificationCategory; title: string; body?: string }>).detail;
      if (detail?.title) push({ category: detail.category, title: detail.title, body: detail.body });
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [push]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const value = useMemo<NotificationContextValue>(
    () => ({ items, unreadCount: items.filter((n) => !n.readAt).length, push, markRead, markAllRead, remove, clearAll }),
    [items, push, markRead, markAllRead, remove, clearAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
