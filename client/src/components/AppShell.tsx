import { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Activity, LogOut } from "lucide-react";

type Props = {
  children: ReactNode;
  sidebar?: ReactNode;
};

function roleToKey(role: string | undefined) {
  switch (role) {
    case "admin":
      return "role.admin";
    case "physiotherapist":
      return "role.physiotherapist";
    case "client":
    case "user":
      return "role.client";
    default:
      return "role.client";
  }
}

export default function AppShell({ children, sidebar }: Props) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const intl = useIntl();

  const impersonating = (user as { __impersonating?: boolean } | null)?.__impersonating;
  const utils = trpc.useUtils();
  const targets = trpc.dev.listImpersonationTargets.useQuery(undefined, {
    // Only meaningful for admins — but the server silently returns [] otherwise.
    enabled: user?.role === "admin",
  });
  
  // Filter out current user from targets
  const otherUsers = (targets.data ?? []).filter((t) => t.id !== user?.id);
  const userInitials = (user?.name ?? user?.email ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
  
  const impersonate = trpc.dev.impersonate.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (error) => {
      console.error("Impersonation failed:", error.message);
    },
  });
  const stopImpersonation = trpc.dev.stopImpersonation.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (error) => {
      console.error("Failed to stop impersonation:", error.message);
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30">
        <div className="container flex items-center gap-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-lg tracking-tight"
          >
            <Activity className="size-5 text-primary" />
            <FormattedMessage id="app.name" />
          </Link>

          <div className="flex-1" />

          <LanguageToggle />

          {isAuthenticated ? (
            <>
              {impersonating && (
                <Badge variant="secondary" className="gap-1">
                  <FormattedMessage
                    id="nav.viewingAs"
                    values={{
                      name: user?.name ?? "",
                      role: intl.formatMessage({ id: roleToKey(user?.role) }),
                    }}
                  />
                </Badge>
              )}

              {/* Dev-only impersonation dropdown (visible only when targets list is non-empty
                  — the server returns empty in production or for non-admins). */}
              {otherUsers.length > 0 && (
                <Select
                  value={impersonating ? String(user?.id ?? "") : "__switch"}
                  onValueChange={(v) => {
                    if (v === "__stop") {
                      stopImpersonation.mutate();
                      return;
                    }
                    if (v) {
                      impersonate.mutate({ userId: Number(v) });
                    }
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue>
                      {impersonating
                        ? `Viewing as ${user?.name ?? user?.email ?? "user"}`
                        : "Switch user"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {impersonating && (
                      <>
                        <SelectItem value="__stop" className="text-red-600">
                          Stop impersonating
                        </SelectItem>
                        <hr className="my-1" />
                      </>
                    )}
                    {otherUsers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name ?? t.email ?? `#${t.id}`} —{" "}
                        {intl.formatMessage({ id: roleToKey(t.role) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Link href="/profile" className="hidden sm:flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/70">
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarImage src={(user as { avatarUrl?: string | null } | null)?.avatarUrl ?? undefined} alt={user?.name ?? user?.email ?? "Profile"} />
                  <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium">{user?.name ?? user?.email ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    <FormattedMessage id={roleToKey(user?.role)} />
                  </span>
                </div>
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                <LogOut className="size-4 mr-1" />
                <FormattedMessage id="nav.signOut" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <a href={getLoginUrl()}>
                <FormattedMessage id="nav.signIn" />
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {sidebar && (
          <aside className="hidden md:block w-60 border-r bg-card/40 p-4 shrink-0">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 min-w-0">
          <div className="container py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
