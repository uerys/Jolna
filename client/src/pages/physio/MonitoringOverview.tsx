import { FormattedMessage } from "react-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle } from "lucide-react";

/**
 * Physio-wide monitoring overview: aggregated pain trend across all clients +
 * high-pain alerts within the last 24h.
 */
export function MonitoringOverview() {
  const all = trpc.physio.listAllMyFeedback.useQuery();

  const rows = all.data ?? [];

  // Build a day-by-day average pain series
  const byDate = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const d = new Date(r.feedback.submittedAt).toISOString().slice(0, 10);
    const cur = byDate.get(d) ?? { total: 0, count: 0 };
    cur.total += r.feedback.painScore;
    cur.count += 1;
    byDate.set(d, cur);
  }
  const chart = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      pain: Number((v.total / v.count).toFixed(1)),
    }));

  const recentHighPain = rows.filter((r) => {
    if (r.feedback.painScore < 7) return false;
    const ageMs = Date.now() - new Date(r.feedback.submittedAt).getTime();
    return ageMs < 1000 * 60 * 60 * 48; // last 48h
  });

  const totalSessions = rows.length;
  const completedSessions = rows.filter((r) => r.feedback.completed).length;
  const completionRate = totalSessions
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {recentHighPain.map((r) => (
        <Alert key={r.feedback.id} variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            <FormattedMessage id="physio.monitor.alert" />
            {" — "}
            {r.client.name ?? r.client.email ?? `#${r.client.id}`}
          </AlertTitle>
          <AlertDescription>
            <FormattedMessage
              id="physio.monitor.alertDesc"
              values={{ score: r.feedback.painScore }}
            />
          </AlertDescription>
        </Alert>
      ))}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Active sessions tracked</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totalSessions}</div></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              <FormattedMessage id="physio.monitor.completion" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{completionRate}%</div>
            <Badge variant="secondary" className="mt-1">{completedSessions} / {totalSessions}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">High-pain alerts (48h)</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-semibold">{recentHighPain.length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><FormattedMessage id="physio.monitor.painTrend" /> — average across clients</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {chart.length === 0 ? (
            <div className="text-muted-foreground"><FormattedMessage id="physio.monitor.noData" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="currentColor" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="currentColor" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="pain" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
