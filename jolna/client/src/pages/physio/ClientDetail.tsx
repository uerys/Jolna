import { useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link, useParams } from "wouter";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Mail,
  Phone,
  Activity,
  CalendarDays,
  User,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DurationBar({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 864e5);
  const elapsed = Math.max(
    0,
    Math.min(totalDays, (now.getTime() - start.getTime()) / 864e5)
  );
  const progress = Math.round((elapsed / totalDays) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDateShort(startDate)}</span>
        <span>{formatDateShort(endDate)}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-emerald-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
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
  const date = new Date(payload.value);
  return (
    <g transform={`translate(${x},${y + 10})`}>
      <foreignObject x={-36} y={0} width={72} height={36}>
        <div className="flex h-full w-full flex-col items-center justify-center text-[10px] leading-tight text-slate-500">
          <span className="font-medium text-slate-700">
            {date.toLocaleDateString([], { month: "numeric", day: "numeric" })}
          </span>
          <span>
            {date
              .toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .toLowerCase()}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

function FeedbackCard({ f }: { f: any }) {
  const notes = f.feedback.notes ?? "";
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight">{f.exercise.title}</p>
        <Badge
          variant="outline"
          className={cn("shrink-0", getPainScoreStyle(f.feedback.painScore))}
        >
          {f.feedback.painScore}/10
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {new Date(f.feedback.submittedAt).toLocaleString()}
      </p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Completed: {f.feedback.completed ? "✓" : "—"}</span>
        {notes && (
          <span className="truncate max-w-[180px]" title={notes}>
            {notes.length > 40 ? notes.slice(0, 40) + "…" : notes}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhysioClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { user, loading } = useAuth();

  const utils = trpc.useUtils();
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const enabled = !!clientId && !loading && user?.role === "physiotherapist";

  const client = trpc.physio.getClientDetail.useQuery(
    { clientId },
    { enabled }
  );
  const clientAssignments = trpc.physio.listClientAssignments.useQuery(
    { clientId },
    { enabled }
  );
  const feedbackEnriched = trpc.physio.listClientFeedbackEnriched.useQuery(
    {
      clientId,
      assignmentId:
        selectedAssignment !== "all" ? Number(selectedAssignment) : undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
    },
    { enabled }
  );
  const stats = trpc.physio.getClientStats.useQuery({ clientId }, { enabled });

  const assignments = clientAssignments.data ?? [];
  const feedback = feedbackEnriched.data ?? [];

  const chartData = useMemo(
    () =>
      [...feedback].reverse().map(f => ({
        id: f.feedback.id,
        submittedAt: f.feedback.submittedAt,
        pain: f.feedback.painScore,
        notes: f.feedback.notes,
      })),
    [feedback]
  );


  const completionRate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  if (!loading && user?.role !== "physiotherapist" && user?.role !== "admin") {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Not authorised</CardTitle>
            <CardDescription>
              Only physiotherapists can view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/physio">
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Link>
      </Button>
      {/* Client info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            {client.data?.name ?? client.data?.email ?? `Client #${clientId}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Mail, label: "Email", value: client.data?.email },
              { icon: Phone, label: "Phone", value: client.data?.phoneNumber },
              {
                icon: Activity,
                label: "Injury type",
                value: formatInjuryType(client.data?.injuryType),
              },
              {
                icon: CalendarDays,
                label: "Next clinic visit",
                value: client.data?.nextClinicVisit
                  ? formatDateShort(client.data.nextClinicVisit)
                  : "Not scheduled",
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value ?? "—"}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge
                  variant={
                    client.data?.status === "active" ? "default" : "secondary"
                  }
                >
                  {client.data?.status ?? "—"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      Filters — above charts
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Assignment</Label>
              <Select
                value={selectedAssignment}
                onValueChange={setSelectedAssignment}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All assignments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignments</SelectItem>
                  {assignments.map(a => (
                    <SelectItem
                      key={a.assignment.id}
                      value={String(a.assignment.id)}
                    >
                      {a.exercise.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                className="h-9"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                className="h-9"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Pain trend — full width, tall on desktop */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <FormattedMessage id="physio.monitor.painTrend" />
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 sm:h-96 lg:h-[34rem] rounded-2xl bg-white text-slate-900 shadow-inner flex flex-col justify-between p-6">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              <FormattedMessage id="physio.monitor.noData" />
            </div>
          ) : (
            <>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="30%" stopColor="#f43f5e" stopOpacity={0.25} />
                        <stop offset="30.1%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="60.1%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="painStroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="30%" stopColor="#f43f5e" />
                        <stop offset="30.1%" stopColor="#f59e0b" />
                        <stop offset="60%" stopColor="#f59e0b" />
                        <stop offset="60.1%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(15,23,42,0.08)"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="submittedAt"
                      tick={<ChartTick />}
                      interval={0}
                      height={48}
                      axisLine={{ stroke: "rgba(15,23,42,0.25)" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255,255,255,0.98)",
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: 16,
                        color: "#0f172a",
                      }}
                      labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                      itemStyle={{ color: "#0f766e" }}
                      labelFormatter={v =>
                        new Date(String(v)).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      }
                      formatter={v => [`${v}/10`, "Pain"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pain"
                      stroke="url(#painStroke)"
                      fill="url(#painFill)"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 2, fill: "#14b8a6" }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Horizontal Severity Bar aligned with Recharts grid */}
              <div className="space-y-1.5 pt-4 ml-[34px] mr-[24px] shrink-0">
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                <div className="flex justify-between text-[10px] font-medium text-slate-400">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {/* Completion rate — full width, horizontal layout */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <FormattedMessage id="physio.monitor.completion" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <div className="text-4xl font-bold text-primary">
                {completionRate}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.data?.completed ?? 0} / {stats.data?.total ?? 0} sessions
              </p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Assignment details */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assignment details</CardTitle>
          <CardDescription>
            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No assignments found.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map(a => (
                <div
                  key={a.assignment.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{a.exercise.title}</h4>
                    <Badge
                      className={
                        a.assignment.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : a.assignment.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      {a.assignment.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    {[
                      {
                        label: "Injury type",
                        value: formatInjuryType(a.assignment.injuryType),
                      },
                      {
                        label: "Exercise type",
                        value: formatExerciseType(a.assignment.exerciseType),
                      },
                      {
                        label: "Sets & reps",
                        value: `${a.assignment.sets} × ${a.assignment.reps}`,
                      },
                      {
                        label: "Assigned",
                        value: new Date(
                          a.assignment.createdAt
                        ).toLocaleDateString(),
                      },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-xs text-muted-foreground">
                          {label}
                        </span>
                        <p className="font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                  <DurationBar
                    startDate={a.assignment.startDate}
                    endDate={a.assignment.endDate}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Session history */}
      {/* Session history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            <FormattedMessage id="physio.monitor.history" />
          </CardTitle>
          <CardDescription>
            {feedback.length} record{feedback.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FormattedMessage id="physio.monitor.noData" />
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="sm:hidden space-y-3">
                {feedback.map(f => (
                  <FeedbackCard key={f.feedback.id} f={f} />
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assignment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Pain score</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedback.map(f => {
                      const notes = f.feedback.notes ?? "";
                      return (
                        <TableRow key={f.feedback.id}>
                          <TableCell className="text-sm font-medium">
                            {f.exercise.title}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(f.feedback.submittedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getPainScoreStyle(
                                f.feedback.painScore
                              )}
                            >
                              {f.feedback.painScore}/10
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {f.feedback.completed ? "✓" : "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-xs" title={notes}>
                            {notes.length > 40
                              ? notes.slice(0, 40) + "…"
                              : notes}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
