import { useMemo, useState } from "react";
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
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Activity,
  CalendarDays,
  Stethoscope,
} from "lucide-react";

function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function DurationBar({ startDate, endDate }: { startDate: string; endDate: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const elapsed = Math.max(0, Math.min(totalDays, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
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

export default function PhysioClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const { user, loading } = useAuth();

  // Filters
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [filterInjuryType, setFilterInjuryType] = useState<string>("all");
  const [filterExerciseType, setFilterExerciseType] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Queries using ownership-safe endpoints
  const client = trpc.physio.getClientDetail.useQuery(
    { clientId },
    { enabled: !!clientId && !loading && user?.role === "physiotherapist" },
  );
  const clientAssignments = trpc.physio.listClientAssignments.useQuery(
    { clientId },
    { enabled: !!clientId && !loading && user?.role === "physiotherapist" },
  );
  const feedbackEnriched = trpc.physio.listClientFeedbackEnriched.useQuery(
    {
      clientId,
      assignmentId: selectedAssignment !== "all" ? Number(selectedAssignment) : undefined,
      from: filterDateFrom || undefined,
      to: filterDateTo || undefined,
    },
    { enabled: !!clientId && !loading && user?.role === "physiotherapist" },
  );
  const stats = trpc.physio.getClientStats.useQuery(
    { clientId },
    { enabled: !!clientId && !loading && user?.role === "physiotherapist" },
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

  // Filter assignments by injury/exercise type
  const filteredAssignments = useMemo(() => {
    let result = clientAssignments.data ?? [];
    if (filterInjuryType !== "all") {
      result = result.filter(a => a.assignment.injuryType === filterInjuryType);
    }
    if (filterExerciseType !== "all") {
      result = result.filter(a => a.assignment.exerciseType === filterExerciseType);
    }
    return result;
  }, [clientAssignments.data, filterInjuryType, filterExerciseType]);

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

  // Pain chart data from filtered feedback
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
    const types = new Set((clientAssignments.data ?? []).map(a => a.assignment.injuryType));
    return [...types];
  }, [clientAssignments.data]);

  const exerciseTypes = useMemo(() => {
    const types = new Set((clientAssignments.data ?? []).map(a => a.assignment.exerciseType));
    return [...types];
  }, [clientAssignments.data]);

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/physio">
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Link>
      </Button>

      {/* Client Info Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            {client.data?.name ?? client.data?.email ?? `Client #${clientId}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{client.data?.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{client.data?.phoneNumber ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Injury Type</p>
                <p className="text-sm font-medium">{formatInjuryType(client.data?.injuryType)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Next Clinic Visit</p>
                <p className="text-sm font-medium">
                  {client.data?.nextClinicVisit ? formatDateShort(client.data.nextClinicVisit) : "Not scheduled"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={client.data?.status === "active" ? "default" : "secondary"}>
                  {client.data?.status ?? "—"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base"><FormattedMessage id="physio.monitor.painTrend" /></CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-80 rounded-2xl bg-white text-slate-900 shadow-inner">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <FormattedMessage id="physio.monitor.noData" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 16, right: 16, bottom: 42, left: 8 }}>
                  <defs>
                    <linearGradient id="clientDetailPainFill" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="pain" stroke="#14b8a6" fill="url(#clientDetailPainFill)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: "#14b8a6" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base"><FormattedMessage id="physio.monitor.completion" /></CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-64 sm:h-80">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
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
                  {(clientAssignments.data ?? []).map((a) => (
                    <SelectItem key={a.assignment.id} value={String(a.assignment.id)}>
                      {a.exercise.title}
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

      {/* Assignment Details */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assignment Details</CardTitle>
          <CardDescription>
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No assignments found.</p>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((a) => (
                <div key={a.assignment.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{a.exercise.title}</h4>
                    <Badge className={
                      a.assignment.status === "active" ? "bg-emerald-100 text-emerald-800" :
                      a.assignment.status === "completed" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }>
                      {a.assignment.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Injury Type</span>
                      <p className="font-medium">{formatInjuryType(a.assignment.injuryType)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Exercise Type</span>
                      <p className="font-medium">{formatExerciseType(a.assignment.exerciseType)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Sets & Reps</span>
                      <p className="font-medium">{a.assignment.sets} × {a.assignment.reps}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Assigned</span>
                      <p className="font-medium">{new Date(a.assignment.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <DurationBar startDate={a.assignment.startDate} endDate={a.assignment.endDate} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base"><FormattedMessage id="physio.monitor.history" /></CardTitle>
          <CardDescription>
            Assignment-based session history ({filteredFeedback.length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FormattedMessage id="physio.monitor.noData" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Injury Type</TableHead>
                    <TableHead>Exercise Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Pain Score</TableHead>
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
                        {new Date(f.feedback.submittedAt).toLocaleString()}
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
    </AppShell>
  );
}
