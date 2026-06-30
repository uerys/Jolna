import { FormattedMessage } from "react-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle } from "lucide-react";

function formatChartTick(value: string) {
  const date = new Date(value);
  const datePart = date.toLocaleDateString([], {
    month: "numeric",
    day: "numeric",
  });
  const timePart = date
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return { datePart, timePart };
}

function ChartTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  if (typeof x !== "number" || typeof y !== "number" || !payload?.value)
    return null;

  const { datePart, timePart } = formatChartTick(payload.value);

  return (
    <g transform={`translate(${x},${y + 12})`}>
      <foreignObject x={-28} y={0} width={56} height={34}>
        <div className="flex h-full w-full flex-col items-center justify-center text-[10px] leading-tight text-slate-500">
          <span className="font-medium text-slate-700">{datePart}</span>
          <span>{timePart}</span>
        </div>
      </foreignObject>
    </g>
  );
}

/**
 * Physio-wide monitoring overview: aggregated pain score across all clients +
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

  const recentHighPain = rows.filter(r => {
    if (r.feedback.painScore < 7) return false;
    const ageMs = Date.now() - new Date(r.feedback.submittedAt).getTime();
    return ageMs < 1000 * 60 * 60 * 48; // last 48h
  });

  const totalSessions = rows.length;
  const completedSessions = rows.filter(r => r.feedback.completed).length;
  const completionRate = totalSessions
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {recentHighPain.map(r => (
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
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              Active sessions tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{totalSessions}</div>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              <FormattedMessage id="physio.monitor.completion" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{completionRate}%</div>
            <Badge variant="secondary" className="mt-1">
              {completedSessions} / {totalSessions}
            </Badge>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">
              High-pain alerts (48h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {recentHighPain.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            <FormattedMessage id="physio.monitor.painTrendAvg" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72 sm:h-[420px] rounded-3xl bg-white text-slate-900 shadow-inner">
          {chart.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              <FormattedMessage id="physio.monitor.noData" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart}
                margin={{ top: 24, right: 18, bottom: 42, left: 8 }}
              >
                <defs>
                  <linearGradient
                    id="physioPainFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop
                      offset="100%"
                      stopColor="#14b8a6"
                      stopOpacity={0.04}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(15, 23, 42, 0.08)"
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="date"
                  stroke="rgba(15, 23, 42, 0.6)"
                  tick={<ChartTick />}
                  interval={0}
                  height={38}
                  axisLine={{ stroke: "rgba(15, 23, 42, 0.25)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 10]}
                  stroke="rgba(15, 23, 42, 0.6)"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  width={26}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    borderRadius: 16,
                    color: "#0f172a",
                    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
                  }}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                  itemStyle={{ color: "#0f766e" }}
                  labelFormatter={value =>
                    new Date(String(value)).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  }
                  formatter={value => [`${value}/10`, "Pain"]}
                />
                <Area
                  type="monotone"
                  dataKey="pain"
                  stroke="#14b8a6"
                  fill="url(#physioPainFill)"
                  strokeWidth={3}
                  dot={{ r: 3.5, strokeWidth: 2, fill: "#14b8a6" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
