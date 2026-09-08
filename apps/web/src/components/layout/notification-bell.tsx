import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { AppNotification } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => api.get<AppNotification[]>("/notifications"),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const count = unreadCount?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${count} unread)`}>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {count > 0 && (
            <button
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {!notifications || notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            notifications.slice(0, 10).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn("flex flex-col items-start gap-0.5 whitespace-normal", !n.isRead && "bg-accent/50")}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">{n.message}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifications" className="justify-center text-sm font-medium text-primary">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
