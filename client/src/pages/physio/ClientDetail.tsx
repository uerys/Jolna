import { FormattedMessage } from "react-intl";
import { Link, useParams } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";

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

export default function PhysioClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const { user, loading } = useAuth();

  const client = trpc.admin.getUser.useQuery(
    { id: clientId },
    { enabled: !!clientId },
  );
  const feedback = trpc.physio.listClientFeedback.useQuery(
    { clientId },
    { enabled: !!clientId },
  );
  const stats = trpc.physio.getClientStats.useQuery(
    { clientId },
    { enabled: !!clientId },
  );

  if (!loading && user?.role !== "physiotherapist" && user?.role !== "admin") {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Not authorised</CardTitle>
            <CardDescription>Only physiotherapists can view this page.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const chart = (feedback.data ?? [])
    .slice()
    .reverse()
    .map((f) => ({
      submittedAt: f.submittedAt,
      pain: f.painScore,
    }));
  const rate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/physio">
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">
        {client.data?.name ?? client.data?.email ?? `#${clientId}`}
      </h1>
      <p className="text-sm text-muted-foreground">{client.data?.email}</p>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="physio.monitor.painTrend" /></CardTitle>
          </CardHeader>
          <CardContent className="h-72 sm:h-[420px] rounded-3xl bg-white text-slate-900 shadow-inner">
            {chart.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <FormattedMessage id="physio.monitor.noData" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 24, right: 18, bottom: 42, left: 8 }}>
                  <defs>
                    <linearGradient id="clientDetailPainFill" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#clientDetailPainFill)"
                    strokeWidth={3}
                    dot={{ r: 3.5, strokeWidth: 2, fill: "#14b8a6" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="physio.monitor.completion" /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{rate}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.data?.completed ?? 0} / {stats.data?.total ?? 0} sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle><FormattedMessage id="physio.monitor.history" /></CardTitle>
        </CardHeader>
        <CardContent>
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
              {(feedback.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    <FormattedMessage id="physio.monitor.noData" />
                  </TableCell>
                </TableRow>
              )}
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
                  <TableCell className="text-sm">{f.notes ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
