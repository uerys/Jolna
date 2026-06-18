import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bell, CheckCheck, Clock3 } from "lucide-react";
import { useIntl } from "react-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

type Props = Readonly<{
  enabled: boolean;
}>;

export function NotificationCenter(props: Props) {
  const { enabled } = props;
  const [, navigate] = useLocation();
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const notificationsQuery = trpc.notifications.listMine.useQuery(undefined, {
    enabled,
    refetchInterval: 5000,
  });
  const unreadCountQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled,
    refetchInterval: 5000,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.listMine.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]);
    },
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notifications.listMine.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]);
    },
  });

  const unreadCount = unreadCountQuery.data ?? 0;
  const notifications = notificationsQuery.data ?? [];
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const handleOpenNotification = (id: number, href?: string | null) => {
    markRead.mutate({ id });
    setOpen(false);
    if (href) navigate(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            {intl.formatMessage({ id: "notifications.title" })}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} className="w-96 p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <div className="font-medium">
              {intl.formatMessage({ id: "notifications.title" })}
            </div>
            <div className="text-xs text-muted-foreground">
              {intl.formatMessage(
                { id: "notifications.unreadCount" },
                { count: unreadCount }
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            <CheckCheck className="size-4 mr-1" />
            {intl.formatMessage({ id: "notifications.markAllRead" })}
          </Button>
        </div>

        <ScrollArea className="max-h-96 overflow-hidden">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">
                {intl.formatMessage({ id: "notifications.empty" })}
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification, index) => {
                  const unread = !notification.readAt;
                  return (
                    <div key={notification.id}>
                      <button
                        type="button"
                        className={`w-full rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/70 ${
                          unread ? "bg-muted/30" : "bg-background"
                        }`}
                        onClick={() =>
                          handleOpenNotification(
                            notification.id,
                            notification.href
                          )
                        }
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1 size-2 rounded-full ${
                              unread ? "bg-primary" : "bg-transparent"
                            }`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div
                                className={`text-sm ${unread ? "font-medium" : ""}`}
                              >
                                {notification.title}
                              </div>
                              <Clock3 className="size-3.5 shrink-0 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-3">
                              {notification.content}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {timeFormatter.format(
                                new Date(notification.createdAt)
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                      {index < notifications.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
