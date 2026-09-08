import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";
import type { AppNotification } from "@/types";

function entityHref(n: AppNotification): string | null {
  if (n.entityType === "ticket" && n.entityId) return `/tickets/${n.entityId}`;
  if (n.entityType === "knowledge_article" && n.entityId) return `/knowledge-base/${n.entityId}`;
  return null;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => api.get<AppNotification[]>("/notifications"),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread`}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications" description="You're all caught up." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {notifications.map((n) => {
            const href = entityHref(n);
            const content = (
              <div className={cn("flex items-start gap-3 p-4", !n.isRead && "bg-accent/40")}>
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            );
            return (
              <li key={n.id} onClick={() => !n.isRead && markRead.mutate(n.id)}>
                {href ? (
                  <Link to={href} className="block hover:bg-secondary/50">{content}</Link>
                ) : (
                  <div className="cursor-pointer hover:bg-secondary/50">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
