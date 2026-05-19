import { FormattedMessage } from "react-intl";
import { useEffect } from "react";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Activity, BarChart3, HeartPulse, Users } from "lucide-react";

function dashboardPathFor(role: string | undefined) {
  switch (role) {
    case "admin":
      return "/admin/users";
    case "physiotherapist":
      return "/physio";
    case "client":
    case "user":
    default:
      return "/client/today";
  }
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Auto-redirect signed-in users to their role dashboard, but only when on "/"
  useEffect(() => {
    if (!loading && isAuthenticated && location === "/") {
      navigate(dashboardPathFor(user?.role), { replace: true });
    }
  }, [loading, isAuthenticated, user?.role, location, navigate]);

  return (
    <AppShell>
      <section className="max-w-3xl py-16">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <FormattedMessage id="home.heroTitle" />
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          <FormattedMessage id="home.heroSubtitle" />
        </p>

        <div className="mt-8">
          {!isAuthenticated ? (
            <Button asChild size="lg">
              <a href={getLoginUrl()}>
                <FormattedMessage id="home.ctaSignIn" />
              </a>
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => navigate(dashboardPathFor(user?.role))}
            >
              <FormattedMessage id="home.ctaContinue" />
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3 max-w-5xl pb-12">
        <Feature icon={<Users className="size-5" />} title="Manage clients" desc="Create accounts, approve new users, and assign clients to physiotherapists." />
        <Feature icon={<HeartPulse className="size-5" />} title="Daily routines" desc="Clients see their exercises for today, watch the demo video, and log pain & completion." />
        <Feature icon={<BarChart3 className="size-5" />} title="Track recovery" desc="Physiotherapists monitor pain trends, completion rates, and session history per client." />
      </section>
    </AppShell>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
