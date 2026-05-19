import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation } from "wouter";
import AppShell from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { History as HistoryIcon } from "lucide-react";

function formatChartTick(value: string) {
  const date = new Date(value);
  const datePart = date.toLocaleDateString([], { month: "numeric", day: "numeric" });
  const timePart = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
  return { datePart, timePart };
}

function ChartTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  if (typeof x !== "number" || typeof y !== "number" || !payload?.value) return null;

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

export default function ClientHistory() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const isClient = !!user && (user.role === "client" || user.role === "user");

  const feedback = trpc.clientApp.listMyFeedback.useQuery(undefined, {
    enabled: !loading && isClient,
  });
  const stats = trpc.clientApp.myStats.useQuery(undefined, {
    enabled: !loading && isClient,
  });

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") navigate("/admin/users", { replace: true });
    else if (user.role === "physiotherapist") navigate("/physio", { replace: true });
  }, [loading, user, navigate]);

  if (!loading && user && !isClient) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="common.notAuthorised" /></CardTitle>
            <CardDescription><FormattedMessage id="client.today.onlyClient" /></CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const chartData = (feedback.data ?? [])
    .slice()
    .reverse()
    .map((f) => ({
      submittedAt: f.submittedAt,
      label: new Date(f.submittedAt).toLocaleDateString(),
      pain: f.painScore,
    }));

  const rate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <HistoryIcon className="size-6 text-primary shrink-0" />
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg"><FormattedMessage id="physio.monitor.painTrend" /></CardTitle>
          </CardHeader>
          <CardContent className="h-72 sm:h-[420px] rounded-3xl bg-white text-slate-900 shadow-inner">
            {chartData.length === 0 ? (
              <div className="text-sm text-slate-500 flex items-center justify-center h-full"><FormattedMessage id="physio.monitor.noData" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 24, right: 18, bottom: 42, left: 8 }}>
                  <defs>
                    <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />
                  <XAxis
                    dataKey="submittedAt"
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
                    labelFormatter={(value) =>
                      new Date(String(value)).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    }
                    formatter={(value) => [`${value}/10`, "Pain"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pain"
                    stroke="#14b8a6"
                    fill="url(#painFill)"
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 2, fill: "#14b8a6" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg"><FormattedMessage id="physio.monitor.completion" /></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-64 sm:h-80">
            <div className="space-y-4">
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-primary">{rate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.data?.completed ?? 0} / {stats.data?.total ?? 0} sessions completed
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg"><FormattedMessage id="physio.monitor.history" /></CardTitle>
        </CardHeader>
        <CardContent>
          {(feedback.data ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FormattedMessage id="physio.monitor.noData" />
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-0 sm:overflow-x-auto">
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Pain</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.data?.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(f.submittedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={f.painScore >= 7 ? "destructive" : f.painScore >= 4 ? "secondary" : "default"}>
                            {f.painScore}/10
                          </Badge>
                        </TableCell>
                        <TableCell>{f.completed ? "✓" : "—"}</TableCell>
                        <TableCell className="text-sm max-w-xs">{f.notes ?? ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="block sm:hidden space-y-3">
                {feedback.data?.map((f) => (
                  <div key={f.id} className="border rounded-lg p-3 bg-muted/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(f.submittedAt).toLocaleString()}
                      </span>
                      <Badge variant={f.painScore >= 7 ? "destructive" : f.painScore >= 4 ? "secondary" : "default"}>
                        {f.painScore}/10
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Completed:</span>
                      <span className="font-medium">{f.completed ? "✓" : "—"}</span>
                    </div>
                    {f.notes && (
                      <div className="text-xs text-foreground/80 bg-white/50 p-2 rounded">
                        {f.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
