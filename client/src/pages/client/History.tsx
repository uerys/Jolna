import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, History as HistoryIcon, TrendingUp } from "lucide-react";

function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function ChartTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  if (typeof x !== "number" || typeof y !== "number" || !payload?.value) return null;
  const date = new Date(payload.value);
  const datePart = date.toLocaleDateString([], { month: "numeric", day: "numeric" });
  const timePart = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

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
  const isClient = !!user && (user.role === "client" || user.role === "user");

  // Filters
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [filterInjuryType, setFilterInjuryType] = useState<string>("all");
  const [filterExerciseType, setFilterExerciseType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Queries
  const allAssignments = trpc.clientApp.listAllMyAssignments.useQuery(undefined, {
    enabled: !loading && isClient,
  });

  const feedbackEnriched = trpc.clientApp.listMyFeedbackEnriched.useQuery(
    {
      assignmentId: selectedAssignment !== "all" ? Number(selectedAssignment) : undefined,
      from: filterDateFrom || undefined,
      to: filterDateTo || undefined,
    },
    { enabled: !loading && isClient },
  );

  const stats = trpc.clientApp.myStats.useQuery(undefined, {
    enabled: !loading && isClient,
  });

  // Filter feedback by injury/exercise type
  const filteredFeedback = useMemo(() => {
    let result = feedbackEnriched.data ?? [];
    if (filterInjuryType !== "all") {
      result = result.filter(f => f.assignment.injuryType === filterInjuryType);
    }
    if (filterExerciseType !== "all") {
      result = result.filter(f => f.assignment.exerciseType === filterExerciseType);
    }
    return result;
  }, [feedbackEnriched.data, filterInjuryType, filterExerciseType]);

  // Pain chart data
  const chartData = useMemo(() =>
    [...(filteredFeedback ?? [])]
      .reverse()
      .map((f) => ({
        submittedAt: f.feedback.submittedAt,
        pain: f.feedback.painScore,
      })),
    [filteredFeedback]
  );

  const rate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  // Unique injury types and exercise types for filter dropdowns
  const injuryTypes = useMemo(() => {
    const types = new Set((allAssignments.data ?? []).map(a => a.assignment.injuryType));
    return [...types];
  }, [allAssignments.data]);

  const exerciseTypes = useMemo(() => {
    const types = new Set((allAssignments.data ?? []).map(a => a.assignment.exerciseType));
    return [...types];
  }, [allAssignments.data]);

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/client/exercises">
          <ArrowLeft className="size-4 mr-1" />
          Back to Exercises
        </Link>
      </Button>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <HistoryIcon className="size-6 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <FormattedMessage id="client.history.title" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your rehabilitation progress over time
          </p>
        </div>
      </div>

      {/* Self-Monitoring Summary */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <CardTitle className="text-base">Pain Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="h-64 sm:h-72 rounded-2xl bg-white text-slate-900 shadow-inner">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No data yet. Submit feedback to see your pain trend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 16, right: 16, bottom: 42, left: 8 }}>
                  <defs>
                    <linearGradient id="historyPainFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="4 4" />
                  <XAxis dataKey="submittedAt" stroke="rgba(15, 23, 42, 0.6)" tick={<ChartTick />} interval={0} height={38} axisLine={{ stroke: "rgba(15, 23, 42, 0.25)" }} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="rgba(15, 23, 42, 0.6)" fontSize={11} axisLine={false} tickLine={false} width={26} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(255,255,255,0.98)", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 16, color: "#0f172a", boxShadow: "0 20px 60px rgba(15,23,42,0.12)" }}
                    labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                    itemStyle={{ color: "#0f766e" }}
                    labelFormatter={(value) => new Date(String(value)).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    formatter={(value) => [`${value}/10`, "Pain"]}
                  />
                  <Area type="monotone" dataKey="pain" stroke="#14b8a6" fill="url(#historyPainFill)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#14b8a6" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-64 sm:h-72">
            <div className="space-y-4">
              <div>
                <div className="text-4xl font-bold text-primary">{rate}%</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.data?.completed ?? 0} / {stats.data?.total ?? 0} sessions completed
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${rate}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Keep up the consistency! Regular completion leads to better outcomes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Assignment</Label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  {(allAssignments.data ?? []).map((a) => (
                    <SelectItem key={a.assignment.id} value={String(a.assignment.id)}>
                      {a.exercise.title} ({a.assignment.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Injury Type</Label>
              <Select value={filterInjuryType} onValueChange={setFilterInjuryType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {injuryTypes.map((t) => (
                    <SelectItem key={t} value={t}>{formatInjuryType(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Exercise Type</Label>
              <Select value={filterExerciseType} onValueChange={setFilterExerciseType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {exerciseTypes.map((t) => (
                    <SelectItem key={t} value={t}>{formatExerciseType(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" className="h-9" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" className="h-9" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session History</CardTitle>
          <CardDescription>
            {filteredFeedback.length} record{filteredFeedback.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback records found. Submit feedback after completing your exercises.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead>Injury Type</TableHead>
                    <TableHead>Exercise Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Pain</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((f) => (
                    <TableRow key={f.feedback.id}>
                      <TableCell className="text-sm font-medium">{f.exercise.title}</TableCell>
                      <TableCell className="text-sm">{formatInjuryType(f.assignment.injuryType)}</TableCell>
                      <TableCell className="text-sm">{formatExerciseType(f.assignment.exerciseType)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(f.feedback.submittedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.feedback.painScore >= 7 ? "destructive" : f.feedback.painScore >= 4 ? "secondary" : "default"}>
                          {f.feedback.painScore}/10
                        </Badge>
                      </TableCell>
                      <TableCell>{f.feedback.completed ? "✓" : "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{f.feedback.notes ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Transparency Notice */}
      <Card className="mt-6 border-muted">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Self-Monitoring:</strong> This page shows your complete rehabilitation history. Your physiotherapist can also view this data to monitor your progress and adjust your treatment plan accordingly.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
