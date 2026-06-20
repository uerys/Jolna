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

  const localizeNotification = (title: string, content: string, type: string) => {
    const titleParts = title.split(" / ");
    const contentParts = content.split(" / ");
    const isKhmer = intl.locale === "km" || intl.locale === "kh";

    if (titleParts.length === 2 && contentParts.length === 2) {
      return {
        title: isKhmer ? titleParts[1] : titleParts[0],
        content: isKhmer ? contentParts[1] : contentParts[0],
      };
    }

    let localizedTitle = title;
    let localizedContent = content;

    if (type === "assignment_created") {
      localizedTitle = isKhmer ? "លំហាត់ថ្មីត្រូវបានផ្ដល់" : "New exercise assigned";
      const match = content.match(/^(.+?)(?:\s+was assigned to you|\s+ត្រូវបានផ្ដល់ឲ្យអ្នកហើយ)/);
      const exName = match ? match[1].trim() : "Exercise";
      localizedContent = isKhmer
        ? `${exName} ត្រូវបានផ្ដល់ឲ្យអ្នកហើយ។ សូមចូលទៅមើលក្នុងផ្ទាំងលំហាត់របស់អ្នក។`
        : `${exName} was assigned to you. Open your exercise list to review the plan.`;
    } else if (type === "assignment_status_updated") {
      localizedTitle = isKhmer ? "ស្ថានភាពលំហាត់ត្រូវបានធ្វើបច្ចុប្បន្នភាព" : "Assignment status updated";
      
      let exName = "Exercise";
      let statusRaw = "";
      
      if (content.startsWith("ស្ថានភាពលំហាត់")) {
        const exMatch = content.match(/^ស្ថានភាពលំហាត់\s+(.+?)\s+ត្រូវបានផ្លាស់ប្តូរ/i);
        const statusMatch = content.match(/ត្រូវបានផ្លាស់ប្តូរទៅជា\s*(.+?)(?:\.|$|។)/i);
        exName = exMatch ? exMatch[1].trim() : "Exercise";
        statusRaw = statusMatch ? statusMatch[1].trim() : "";
      } else {
        const exMatch = content.match(/^(.+?)(?:\s+was updated to|\s+status was updated to)/i);
        const statusMatch = content.match(/(?:was updated to|status was updated to)\s*(.+?)(?:\.|$)/i);
        exName = exMatch ? exMatch[1].trim() : "Exercise";
        statusRaw = statusMatch ? statusMatch[1].trim() : "";
      }

      let statusLabel = statusRaw;
      if (isKhmer) {
        if (statusRaw.toLowerCase() === "active" || statusRaw === "សកម្ម") statusLabel = "សកម្ម";
        else if (statusRaw.toLowerCase() === "completed" || statusRaw === "បានបញ្ចប់") statusLabel = "បានបញ្ចប់";
        else if (statusRaw.toLowerCase() === "cancelled" || statusRaw === "បានលុបចោល") statusLabel = "បានលុបចោល";
        else statusLabel = "បានធ្វើបច្ចុប្បន្នភាព";
      } else {
        if (statusRaw === "សកម្ម" || statusRaw.toLowerCase() === "active") statusLabel = "active";
        else if (statusRaw === "បានបញ្ចប់" || statusRaw.toLowerCase() === "completed") statusLabel = "completed";
        else if (statusRaw === "បានលុបចោល" || statusRaw.toLowerCase() === "cancelled") statusLabel = "cancelled";
        else statusLabel = "updated";
      }

      localizedContent = isKhmer
        ? `ស្ថានភាពលំហាត់ ${exName} ត្រូវបានផ្លាស់ប្តូរទៅជា ${statusLabel}។`
        : `${exName} status was updated to ${statusLabel}.`;
    } else if (type === "new_message") {
      const match = title.match(/(?:New message from|សារថ្មីពី)\s*(.+)$/i);
      const senderName = match ? match[1].trim() : "Someone";
      localizedTitle = isKhmer ? `សារថ្មីពី ${senderName}` : `New message from ${senderName}`;
    } else if (type === "password_reset_requested") {
      const match = title.match(/(?:Password Reset Request|ស្នើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញ)\s*-\s*(.+)$/i);
      const requesterName = match ? match[1].trim() : "User";
      localizedTitle = isKhmer 
        ? `ស្នើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញ - ${requesterName}` 
        : `Password Reset Request - ${requesterName}`;
    }

    return { title: localizedTitle, content: localizedContent };
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

        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">
                {intl.formatMessage({ id: "notifications.empty" })}
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification, index) => {
                  const unread = !notification.readAt;
                  const { title, content } = localizeNotification(
                    notification.title,
                    notification.content,
                    notification.type
                  );
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
                                {title}
                              </div>
                              <Clock3 className="size-3.5 shrink-0 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-3">
                              {content}
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
