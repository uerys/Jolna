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
import { useI18n } from "@/contexts/I18nContext";
import { NotificationCenter } from "@/components/NotificationCenter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut } from "lucide-react";

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

export default function AppShell({ children, sidebar }: Readonly<Props>) {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const intl = useIntl();
  const { language, setLanguage } = useI18n();
  const impersonating = (user as { __impersonating?: boolean } | null)
    ?.__impersonating;
  const utils = trpc.useUtils();
  const targets = trpc.dev.listImpersonationTargets.useQuery(undefined, {
    // Only admins can access this endpoint; avoid noisy forbidden errors for clients.
    enabled: user?.role === "admin",
  });

  // Filter out current user from targets
  const otherUsers = (targets.data ?? []).filter(t => t.id !== user?.id);
  const userInitials =
    (user?.name ?? user?.email ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const impersonate = trpc.dev.impersonate.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: error => {
      console.error("Impersonation failed:", error.message);
    },
  });

  const handleSignOutClick = () => {
    const confirmMsg =
      language === "kh"
        ? "តើអ្នកប្រាកដជាចង់ចាកចេញមែនទេ?"
        : "Are you sure you want to sign out?";
    if (window.confirm(confirmMsg)) {
      logout();
    }
  };
  const stopImpersonation = trpc.dev.stopImpersonation.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/");
    },
    onError: error => {
      console.error("Failed to stop impersonation:", error.message);
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b-[0.5px] border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-0 z-30 px-6 py-2">
        <div className="container flex items-center gap-3 py-1">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity select-none"
          >
            <img
              src="/logo.png"
              alt="JOLNA Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-bold tracking-tight text-slate-900 font-sans">
              JOLNA
            </span>
          </Link>

          <div className="flex-1" />

          <button
            onClick={() => setLanguage(language === "en" ? "kh" : "en")}
            className="h-8 border-[0.5px] border-slate-200 bg-white hover:bg-slate-50 px-3.5 rounded-full text-slate-600 font-semibold text-xs transition flex items-center gap-1.5 focus:outline-none"
            aria-label="Toggle language"
          >
            <span>{language === "en" ? "🇺🇸 EN" : "🇰🇭 KH"}</span>
          </button>
          {isAuthenticated && <NotificationCenter enabled={isAuthenticated} />}

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
                  onValueChange={v => {
                    if (v === "__stop") {
                      stopImpersonation.mutate();
                      return;
                    }
                    if (v) {
                      impersonate.mutate({ userId: Number(v) });
                    }
                  }}
                >
                  <SelectTrigger className="w-64">
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
                    {otherUsers.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name ?? t.email ?? `#${t.id}`} —{" "}
                        {intl.formatMessage({ id: roleToKey(t.role) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70"
              >
                <Avatar className="h-9 w-9 border shrink-0">
                  <AvatarImage
                    src={
                      (user as { avatarUrl?: string | null } | null)
                        ?.avatarUrl ?? undefined
                    }
                    alt={user?.name ?? user?.email ?? "Profile"}
                  />
                  <AvatarFallback className="text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium">
                    {user?.name ?? user?.email ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <FormattedMessage id={roleToKey(user?.role)} />
                  </span>
                </div>
              </Link>
              <Button
                onClick={handleSignOutClick}
                className="h-8 px-3 sm:px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition flex items-center gap-1.5 shadow-sm border-none"
              >
                <LogOut className="size-3.5 text-white" />
                <span className="hidden sm:inline">
                  <FormattedMessage id="nav.signOut" />
                </span>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="h-8 px-4 bg-[#534AB7] hover:bg-[#534AB7]/90 text-white font-semibold text-xs rounded-full transition shadow-sm border-none"
            >
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
