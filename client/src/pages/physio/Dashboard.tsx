import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { EXERCISE_TYPES, INJURY_TYPES } from "../../../../drizzle/schema";
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, Stethoscope, Trash2, Search, ChevronRight, AlertCircle, Users } from "lucide-react";

export default function PhysioDashboard() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // If a non-physio lands here (e.g. admin clicking a direct link),
  // bounce them to their own dashboard instead of showing a raw RBAC error.
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") {
      navigate("/admin/users", { replace: true });
    } else if (user.role === "client" || user.role === "user") {
      navigate("/client/today", { replace: true });
    }
  }, [loading, user, navigate]);

  if (!loading && user?.role !== "physiotherapist") {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="common.notAuthorised" /></CardTitle>
            <CardDescription><FormattedMessage id="physio.dashboard.onlyPhysio" /></CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            <FormattedMessage id="physio.dashboard.title" />
          </h1>
          <p className="text-sm text-muted-foreground">
            <FormattedMessage id="physio.dashboard.subtitle" />
          </p>
        </div>
      </div>

      <Tabs defaultValue="clients" className="mt-6">
        <TabsList className="bg-slate-100/80 p-1 border border-slate-200/50 rounded-xl mb-4 h-10 w-fit">
          <TabsTrigger
            value="clients"
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-b-indigo-600 font-semibold px-4 rounded-lg text-sm h-full"
          >
            <FormattedMessage id="physio.tab.clients" />
          </TabsTrigger>
          <TabsTrigger
            value="exercises"
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-b-indigo-600 font-semibold px-4 rounded-lg text-sm h-full"
          >
            <FormattedMessage id="physio.tab.exercises" />
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-b-indigo-600 font-semibold px-4 rounded-lg text-sm h-full"
          >
            <FormattedMessage id="physio.tab.assignments" />
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:font-bold data-[state=active]:border-b-2 data-[state=active]:border-b-indigo-600 font-semibold px-4 rounded-lg text-sm h-full"
          >
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients"><ClientsTab /></TabsContent>
        <TabsContent value="exercises"><ExercisesTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="configuration"><ConfigurationTab /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------- Clients tab ---------- */

function ClientsTab() {
  const clients = trpc.physio.listMyClients.useQuery();
  const assignments = trpc.physio.listMyAssignments.useQuery();
  const feedback = trpc.physio.listAllMyFeedback.useQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [triageFilter, setTriageFilter] = useState<"all" | "urgent">("all");
  const [clientStatusFilter, setClientStatusFilter] = useState<"active" | "suspended" | "all">("active");

  const isLoading = clients.isLoading || assignments.isLoading || feedback.isLoading;

  const clientDataList = useMemo(() => {
    if (!clients.data) return [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const dayBefore = new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000);
    const dayBeforeStr = dayBefore.toISOString().slice(0, 10);

    return clients.data.map((c) => {
      const isActive = c.status === "active";
      // Find assignments for this client
      const cAssignments = (assignments.data ?? []).filter((a) => a.assignment.clientId === c.id);
      const activeSessions = cAssignments.filter((a) => {
        return a.assignment.status === "active" && a.assignment.startDate <= todayStr;
      });

      // Find logs
      const cLogs = (feedback.data ?? []).filter((f) => {
        return f.feedback.assignmentId && cAssignments.some((a) => a.assignment.id === f.feedback.assignmentId);
      });

      const sortedLogs = [...cLogs].sort(
        (a, b) => new Date(b.feedback.submittedAt).getTime() - new Date(a.feedback.submittedAt).getTime()
      );

      const lastLogStr = sortedLogs[0] ? sortedLogs[0].feedback.submittedAt : null;
      const latestPain = sortedLogs[0] ? sortedLogs[0].feedback.painScore : null;

      // Progress rate calculation (elapsed duration progress between start date and end date)
      const today = new Date(todayStr + "T00:00:00");
      let totalProgressPercent = 0;
      activeSessions.forEach((a) => {
        const start = new Date(a.assignment.startDate + "T00:00:00");
        const end = new Date(a.assignment.endDate + "T00:00:00");
        const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5) + 1);
        const elapsed = Math.max(0, Math.min(total, Math.round((today.getTime() - start.getTime()) / 864e5) + 1));
        const percent = Math.round((elapsed / total) * 100);
        totalProgressPercent += percent;
      });
      const progressRate = activeSessions.length > 0 ? Math.round(totalProgressPercent / activeSessions.length) : null;

      // Relative timestamp for last log (using new Date conversion to avoid NaN)
      let lastLogLabel = "No logs yet";
      if (lastLogStr) {
        const lastLogDate = new Date(lastLogStr);
        const date1 = new Date(todayStr + "T00:00:00");
        const date2 = new Date(lastLogDate.getFullYear(), lastLogDate.getMonth(), lastLogDate.getDate());
        const diffDays = Math.floor((date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays <= 0) lastLogLabel = "Last log: Today";
        else if (diffDays === 1) lastLogLabel = "Last log: Yesterday";
        else if (!isNaN(diffDays)) lastLogLabel = `Last log: ${diffDays} days ago`;
      }

      // Pain warning alert message
      let alertMsg = "";
      if (isActive && latestPain !== null && latestPain >= 7) {
        alertMsg = `⚠️ Severe pain reported: ${latestPain}/10`;
      }

      // Categories: active users are urgent (pain >= 7) or ontrack (others)
      const isUrgent = isActive && latestPain !== null && latestPain >= 7;
      const isOnTrack = isActive && !isUrgent;

      let category: "urgent" | "ontrack" | "suspended" = "suspended";
      if (!isActive) category = "suspended";
      else if (isUrgent) category = "urgent";
      else category = "ontrack";

      return {
        client: c,
        lastLogLabel,
        latestPain,
        progressRate,
        activeCount: activeSessions.length,
        alertMsg,
        category,
        isUrgent,
        isOnTrack,
      };
    });
  }, [clients.data, assignments.data, feedback.data]);

  // Aggregate summary metrics
  const triageStats = useMemo(() => {
    let urgent = 0;
    clientDataList.forEach((c) => {
      if (c.category === "urgent") urgent++;
    });
    return { urgent };
  }, [clientDataList]);

  // Filter & Sort clients list
  const filteredClients = useMemo(() => {
    let list = [...clientDataList];

    // 1. Client Status filter (Active by default, can select Suspended or All)
    if (clientStatusFilter === "active") {
      list = list.filter((c) => c.client.status === "active");
    } else if (clientStatusFilter === "suspended") {
      list = list.filter((c) => c.client.status !== "active");
    }

    // 2. Triage summary filter
    if (triageFilter !== "all") {
      list = list.filter((c) => c.category === triageFilter);
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.client.name?.toLowerCase().includes(q) ||
          c.client.email?.toLowerCase().includes(q)
      );
    }

    // 4. Sort: Active first, then suspended (if All is selected)
    list.sort((a, b) => {
      const scoreA = a.client.status === "active" ? 2 : 1;
      const scoreB = b.client.status === "active" ? 2 : 1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // fallback to alphabetical
      return (a.client.name ?? "").localeCompare(b.client.name ?? "");
    });

    return list;
  }, [clientDataList, triageFilter, searchQuery, clientStatusFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-slate-400">
        <FormattedMessage id="common.loading" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">

      {/* ── 1. Triage Alert Banner ──────────────────────────────── */}
      <button
        onClick={() => setTriageFilter(triageFilter === "urgent" ? "all" : "urgent")}
        className={`text-left w-full px-4 py-3 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          triageFilter === "urgent"
            ? "bg-rose-50 border-rose-300 shadow-sm ring-2 ring-rose-400/40 ring-offset-1"
            : "bg-white border-[#E4E7EC] hover:border-rose-200 hover:bg-rose-50/30 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            triageFilter === "urgent" ? "bg-rose-100" : "bg-rose-50"
          }`}>
            <AlertCircle className="size-4 text-rose-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-0.5">
              Urgent Pain Triage
            </h3>
            <p className="text-xs text-[#667085] font-normal leading-relaxed">
              Clients reporting severe pain (≥7/10) requiring immediate intervention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <span className="text-2xl font-bold text-[#101828] tabular-nums">{triageStats.urgent}</span>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
            triageStats.urgent > 0
              ? "bg-rose-100 text-rose-700 animate-pulse"
              : "bg-[#F2F4F7] text-[#667085]"
          }`}>
            {triageStats.urgent > 0 ? "Attention Required" : "All Clear"}
          </span>
        </div>
      </button>

      {/* ── 2. Search & Filter Controls ─────────────────────────── */}
      <div className="bg-white border border-[#E4E7EC] rounded-xl px-3 py-2.5 flex flex-col md:flex-row items-center gap-2.5">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#98A2B3] pointer-events-none" />
          <Input
            type="text"
            placeholder="Search clients by name or email…"
            className="h-8 pl-8 text-xs bg-[#F8FAFC] border-[#E4E7EC] focus-visible:ring-indigo-500 focus-visible:border-indigo-400 rounded-lg w-full font-normal text-[#101828] placeholder:text-[#98A2B3]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-5 bg-[#E4E7EC] shrink-0" />

        {/* Status filter */}
        <div className="w-full md:w-auto shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest shrink-0">Show</span>
          <Select value={clientStatusFilter} onValueChange={(val: any) => setClientStatusFilter(val)}>
            <SelectTrigger className="h-8 bg-[#F8FAFC] border-[#E4E7EC] text-[#344054] text-xs rounded-lg w-36 font-medium">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-[#E4E7EC] text-xs shadow-lg rounded-xl">
              <SelectItem value="active">Undercare</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="all">All clients</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── 3. Active Filter Pills ──────────────────────────────── */}
      {(triageFilter !== "all" || searchQuery.trim() !== "" || clientStatusFilter !== "active") && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest mr-1">Active filters:</span>
          {clientStatusFilter !== "active" && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              Status: {clientStatusFilter === "all" ? "All" : "Suspended"}
              <button onClick={() => setClientStatusFilter("active")} className="hover:text-indigo-900 font-bold leading-none ml-0.5">×</button>
            </span>
          )}
          {triageFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              Urgent Pain
              <button onClick={() => setTriageFilter("all")} className="hover:text-rose-900 font-bold leading-none ml-0.5">×</button>
            </span>
          )}
          {searchQuery.trim() !== "" && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
              &ldquo;{searchQuery}&rdquo;
              <button onClick={() => setSearchQuery("")} className="hover:text-indigo-900 font-bold leading-none ml-0.5">×</button>
            </span>
          )}
        </div>
      )}

      {/* ── 4. Client Cards ─────────────────────────────────────── */}
      <div className="space-y-2.5">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E4E7EC] rounded-xl">
            <div className="p-3 rounded-full bg-[#F2F4F7] mb-3">
              <Users className="size-5 text-[#98A2B3]" />
            </div>
            <p className="text-sm font-medium text-[#667085]">No clients match the current filters</p>
            <p className="text-xs text-[#98A2B3] mt-0.5">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredClients.map((data, idx) => {
            const isSuspended = data.client.status !== "active";

            const painBg = isSuspended || data.latestPain === null
              ? "bg-[#F2F4F7] text-[#98A2B3] border-[#E4E7EC]"
              : data.latestPain >= 7
              ? "bg-rose-50 text-rose-600 border-rose-200"
              : data.latestPain >= 4
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-emerald-50 text-emerald-600 border-emerald-200";

            const progressColor = data.progressRate !== null && data.progressRate < 50
              ? "#F59E0B"
              : "#6366F1";

            const cardAccent = data.category === "urgent"
              ? "border-l-rose-500"
              : data.category === "ontrack"
              ? "border-l-emerald-500"
              : "border-l-[#D0D5DD]";

            return (
              <div
                key={data.client.id}
                className={`client-card-enter bg-white border border-[#E4E7EC] border-l-[3px] ${cardAccent} rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group cursor-pointer ${
                  isSuspended ? "opacity-80" : ""
                }`}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <Link href={`/physio/clients/${data.client.id}`} className="block">
                  <div className="px-5 py-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">

                      {/* ── Col 1: Identity ── */}
                      <div className="flex-1 min-w-0 md:max-w-[220px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#101828] text-[15px] leading-snug tracking-tight truncate">
                            {data.client.name ?? `Patient #${data.client.id}`}
                          </span>
                          {isSuspended ? (
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#F2F4F7] text-[#667085] border border-[#E4E7EC]">
                              Suspended
                            </span>
                          ) : (
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Undercare
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#667085] truncate block leading-relaxed">
                          {data.client.email ?? "—"}
                        </span>
                        {!isSuspended && (
                          <span className="text-[10px] text-[#98A2B3] font-medium mt-0.5 block">
                            {data.lastLogLabel}
                          </span>
                        )}
                      </div>

                      {/* ── Col 2: Pain Level ── */}
                      <div className="flex items-center gap-2 md:w-24 md:justify-center">
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-sm font-semibold ${painBg}`}>
                          {data.latestPain !== null && data.latestPain >= 7 && (
                            <AlertCircle className="size-3.5 text-rose-500 shrink-0" />
                          )}
                          <span className="tabular-nums">
                            {data.latestPain !== null ? `${data.latestPain}/10` : "—"}
                          </span>
                        </div>
                      </div>

                      {/* ── Col 3: Progress ── */}
                      <div className="md:w-36">
                        <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest block mb-1.5 font-sans">
                          Progress
                        </span>
                        {data.progressRate !== null ? (
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-semibold text-[#101828] tabular-nums w-9 shrink-0">
                              {data.progressRate}%
                            </span>
                            <div className="progress-track flex-1">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${data.progressRate}%`,
                                  background: progressColor,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[#98A2B3] font-medium font-sans">No active sessions</span>
                        )}
                      </div>

                      {/* ── Col 4: Active Exercises ── */}
                      <div className="md:w-32">
                        <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest block mb-1">
                          Active Exercises
                        </span>
                        <span className="text-sm font-semibold text-[#344054]">
                          {data.activeCount}
                          <span className="font-normal text-[#667085] ml-1">
                            {data.activeCount !== 1 ? "exercises" : "exercise"}
                          </span>
                        </span>
                      </div>

                      {/* ── CTA ── */}
                      <div className="flex items-center justify-end shrink-0 md:ml-auto">
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                          View details
                          <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                        </span>
                      </div>

                    </div>

                    {/* ── Alert Row ── */}
                    {!isSuspended && data.alertMsg && (
                      <div className={`mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold border ${
                        data.category === "urgent"
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}>
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>{data.alertMsg}</span>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



/* ---------- Exercises tab ---------- */

type Exercise = {
  id: number;
  title: string;
  instructionsEn: string;
  instructionsKh: string;
  videoUrl: string;
  defaultReps: number;
  defaultSets?: number;
};

function ExercisesTab() {
  const intl = useIntl();
  const exercises = trpc.physio.listMyExercises.useQuery();
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const utils = trpc.useUtils();

  const del = trpc.physio.deleteExercise.useMutation({
    onSuccess: () => utils.physio.listMyExercises.invalidate(),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{intl.formatMessage({ id: "physio.tab.exercises" })}</h3>
          <Button size="sm" onClick={() => setCreating(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm">
            <Plus className="size-4 mr-1" />
            <FormattedMessage id="physio.exercise.new" />
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {exercises.isLoading && <div className="text-muted-foreground"><FormattedMessage id="common.loading" /></div>}
          {!exercises.isLoading && (exercises.data?.length ?? 0) === 0 && (
            <div className="text-muted-foreground"><FormattedMessage id="physio.exercise.empty" /></div>
          )}
          {exercises.data?.map((e) => (
            <div key={e.id} className="flex items-start justify-between border rounded-md p-3 gap-3">
              <div className="min-w-0">
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{e.instructionsEn}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Default: {e.defaultSets ?? 1} sets · {e.defaultReps} reps · <a href={e.videoUrl} target="_blank" rel="noreferrer" className="underline">video</a>
                </div>
              </div>
              <div className="shrink-0 space-x-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(e as Exercise)}>
                  <FormattedMessage id="admin.action.edit" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm("Delete exercise?")) del.mutate({ id: e.id });
                }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {(creating || editing) && (
        <ExerciseDialog
          exercise={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </Card>
  );
}

function ExerciseDialog({
  exercise,
  onClose,
}: {
  exercise: Exercise | null;
  onClose: () => void;
}) {
  const intl = useIntl();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(exercise?.title ?? "");
  const [en, setEn] = useState(exercise?.instructionsEn ?? "");
  const [kh, setKh] = useState(exercise?.instructionsKh ?? "");
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? "");
  const [defaultReps, setDefaultReps] = useState(exercise?.defaultReps ?? 10);
  const [defaultSets, setDefaultSets] = useState<number>(exercise?.defaultSets ?? 1);

  const create = trpc.physio.createExercise.useMutation({
    onSuccess: async () => {
      await utils.physio.listMyExercises.invalidate();
      onClose();
    },
  });
  const update = trpc.physio.updateExercise.useMutation({
    onSuccess: async () => {
      await utils.physio.listMyExercises.invalidate();
      onClose();
    },
  });

  function submit() {
    if (!title || !en || !kh || !videoUrl) {
      toast.error(intl.formatMessage({ id: "form.required" }));
      return;
    }
    if (exercise) {
      update.mutate({
        id: exercise.id,
        patch: { title, instructionsEn: en, instructionsKh: kh, videoUrl, defaultReps, defaultSets },
      });
    } else {
      create.mutate({ title, instructionsEn: en, instructionsKh: kh, videoUrl, defaultReps, defaultSets });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <FormattedMessage id={exercise ? "physio.exercise.edit" : "physio.exercise.new"} />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label><FormattedMessage id="physio.exercise.title" /></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label><FormattedMessage id="physio.exercise.instructionsEn" /></Label>
            <Textarea rows={3} value={en} onChange={(e) => setEn(e.target.value)} />
          </div>
          <div>
            <Label><FormattedMessage id="physio.exercise.instructionsKh" /></Label>
            <Textarea rows={3} value={kh} onChange={(e) => setKh(e.target.value)} />
          </div>
          <div>
            <Label><FormattedMessage id="physio.exercise.videoUrl" /></Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/..." />
          </div>
          <div>
            <Label><FormattedMessage id="physio.assign.sets" /></Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={defaultSets}
              onChange={(e) => setDefaultSets(Number(e.target.value))}
            />
          </div>
          <div>
            <Label><FormattedMessage id="physio.exercise.defaultReps" /></Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={defaultReps}
              onChange={(e) => setDefaultReps(Number(e.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}><FormattedMessage id="common.cancel" /></Button>
          <Button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"><FormattedMessage id="physio.exercise.save" /></Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Assignments tab ---------- */

function AssignmentsTab() {
  const intl = useIntl();
  const assignments = trpc.physio.listMyAssignments.useQuery();
  const clients = trpc.physio.listMyClients.useQuery();
  const exercises = trpc.physio.listMyExercises.useQuery();
  const utils = trpc.useUtils();
  const customExTypes = trpc.physio.listCustomExerciseTypes.useQuery();
  const customInjTypes = trpc.physio.listCustomInjuryTypes.useQuery();

  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [exerciseId, setExerciseId] = useState<string>("");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const fortnight = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(fortnight);
  const [reps, setReps] = useState<string | number>(10);
  const [sets, setSets] = useState<string | number>(1);
  const [injuryType, setInjuryType] = useState<string>("");
  const [exerciseType, setExerciseType] = useState<string>("");
  const [dailyFrequency, setDailyFrequency] = useState<string | number>(1);
  const [exercisePreview, setExercisePreview] = useState<null | { title: string; defaultReps?: number; defaultSets?: number; exerciseType?: string }>(null);

  // When an exercise is selected, default reps to the exercise's defaultReps
  useEffect(() => {
    if (!exerciseId) return;
    const ex = exercises.data?.find((e) => String(e.id) === exerciseId);
    if (ex) {
      if (typeof ex.defaultReps === "number") setReps(String(ex.defaultReps));
      if (typeof ex.defaultSets === "number") setSets(String(ex.defaultSets));
      if ((ex as any).exerciseType) setExerciseType((ex as any).exerciseType);
      setExercisePreview({ title: ex.title, defaultReps: ex.defaultReps, defaultSets: ex.defaultSets, exerciseType: (ex as any).exerciseType });
    }
  }, [exerciseId, exercises.data]);

  // If there's only one client or one exercise, preselect them to speed up assignment
  useEffect(() => {
    if (!clientId && clients.data?.length === 1) setClientId(String(clients.data[0].id));
  }, [clients.data, clientId]);
  useEffect(() => {
    if (!exerciseId && exercises.data?.length === 1) setExerciseId(String(exercises.data[0].id));
  }, [exercises.data, exerciseId]);

  const assign = trpc.physio.assignExercise.useMutation({
    onSuccess: async () => {
      await utils.physio.listMyAssignments.invalidate();
      toast.success(intl.formatMessage({ id: "physio.assign.created" }));
      setOpen(false);
    },
  });
  const del = trpc.physio.deleteAssignment.useMutation({
    onSuccess: () => utils.physio.listMyAssignments.invalidate(),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{intl.formatMessage({ id: "physio.tab.assignments" })}</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"><Plus className="size-4 mr-1" /><FormattedMessage id="physio.assign.title" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-slate-950 font-bold text-lg">Assign Exercise Plan</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Create a customized exercise task assigned to this patient.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Patient</Label>
                    <Select value={clientId} onValueChange={(v) => setClientId(v)}>
                      <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                        <SelectValue placeholder="Select patient..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-md">
                        {clients.data?.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name ?? c.email ?? `#${c.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Select Exercise Template</Label>
                    <Select value={exerciseId} onValueChange={(v) => setExerciseId(v)}>
                      <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                        <SelectValue placeholder="Choose exercise template" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-md">
                        {exercises.data?.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Reps</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                      value={reps as unknown as string}
                      onChange={(e) => {
                        const v = e.target.value;
                        setReps(v === "" ? "" : Number(v));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Sets</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                      value={sets as unknown as string}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSets(v === "" ? "" : Number(v));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-indigo-600 uppercase tracking-wider font-sans">PER DAY</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      className="h-10 mt-1 bg-white border-indigo-200 ring-1 ring-indigo-100 focus:ring-indigo-500 text-indigo-700 font-semibold"
                      value={dailyFrequency as unknown as string}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDailyFrequency(v === "" ? "" : Number(v));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Start Date</Label>
                    <Input 
                      type="date" 
                      className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">End Date</Label>
                    <Input 
                      type="date" 
                      className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Injury Type</Label>
                    <Select value={injuryType} onValueChange={(v) => setInjuryType(v)}>
                      <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                        <SelectValue placeholder="Other" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-md">
                        {(customInjTypes.data ?? []).map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">Exercise Type</Label>
                    <Select value={exerciseType} onValueChange={(v) => setExerciseType(v)}>
                      <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                        <SelectValue placeholder="Other" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-slate-200 shadow-md">
                        {(customExTypes.data ?? []).map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6 border-t border-slate-100 pt-4 gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-200 text-xs font-semibold h-9 rounded-lg px-4">
                  <FormattedMessage id="common.cancel" />
                </Button>
                <Button
                  disabled={!clientId || !exerciseId}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-lg px-4 shadow-sm"
                  onClick={() =>
                    assign.mutate({
                      clientId: Number(clientId),
                      exerciseId: Number(exerciseId),
                      reps: (reps === "" ? undefined : Number(reps)),
                      sets: (sets === "" ? undefined : Number(sets)),
                      dailyFrequency: (dailyFrequency === "" ? undefined : Number(dailyFrequency)),
                      injuryType: (injuryType || undefined) as any,
                      exerciseType: (exerciseType || undefined) as any,
                      startDate,
                      endDate,
                    })
                  }
                >
                  <FormattedMessage id="physio.assign.submit" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Client</TableHead>
              <TableHead className="w-[25%]">Exercise</TableHead>
              <TableHead className="w-[8%] text-center">Sets</TableHead>
              <TableHead className="w-[8%] text-center">Reps</TableHead>
              <TableHead className="w-[25%]">Period</TableHead>
              <TableHead className="w-[10%] text-center">Status</TableHead>
              <TableHead className="w-[4%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6"><FormattedMessage id="common.loading" /></TableCell></TableRow>
            )}
            {assignments.data?.map((row) => (
              <TableRow key={row.assignment.id}>
                <TableCell className="w-[20%] font-medium">{row.client.name ?? row.client.email ?? `#${row.client.id}`}</TableCell>
                <TableCell className="w-[25%]">{row.exercise.title}</TableCell>
                <TableCell className="w-[8%] text-center">{row.assignment.sets}</TableCell>
                <TableCell className="w-[8%] text-center">{row.assignment.reps}</TableCell>
                <TableCell className="w-[25%] text-sm text-slate-500 font-mono">{row.assignment.startDate} → {row.assignment.endDate}</TableCell>
                <TableCell className="w-[10%] text-center">
                  <Badge
                    variant="outline"
                    className={
                      row.assignment.status === "active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50/80 border font-semibold text-[10px] rounded-full"
                        : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100 border font-semibold text-[10px] rounded-full"
                    }
                  >
                    {row.assignment.status}
                  </Badge>
                </TableCell>
                <TableCell className="w-[4%] text-right">
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm("Delete assignment?")) del.mutate({ id: row.assignment.id });
                  }}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function ConfigurationTab() {
  const utils = trpc.useUtils();
  const [newExType, setNewExType] = useState("");
  const [newInjType, setNewInjType] = useState("");

  const exTypes = trpc.physio.listCustomExerciseTypes.useQuery();
  const injTypes = trpc.physio.listCustomInjuryTypes.useQuery();

  const createExMutation = trpc.physio.createCustomExerciseType.useMutation({
    onSuccess: () => {
      utils.physio.listCustomExerciseTypes.invalidate();
      setNewExType("");
      toast.success("Exercise type created successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create exercise type");
    },
  });

  const createInjMutation = trpc.physio.createCustomInjuryType.useMutation({
    onSuccess: () => {
      utils.physio.listCustomInjuryTypes.invalidate();
      setNewInjType("");
      toast.success("Injury type created successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create injury type");
    },
  });

  const deleteExMutation = trpc.physio.deleteCustomExerciseType.useMutation({
    onSuccess: () => {
      utils.physio.listCustomExerciseTypes.invalidate();
      toast.success("Exercise type deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete exercise type");
    },
  });

  const deleteInjMutation = trpc.physio.deleteCustomInjuryType.useMutation({
    onSuccess: () => {
      utils.physio.listCustomInjuryTypes.invalidate();
      toast.success("Injury type deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete injury type");
    },
  });

  const handleCreateExType = () => {
    if (!newExType.trim()) return;
    createExMutation.mutate({ name: newExType.trim() });
  };

  const handleCreateInjType = () => {
    if (!newInjType.trim()) return;
    createInjMutation.mutate({ name: newInjType.trim() });
  };

  const handleDeleteExType = (id: number) => {
    if (confirm("Are you sure you want to delete this exercise type?")) {
      deleteExMutation.mutate({ id });
    }
  };

  const handleDeleteInjType = (id: number) => {
    if (confirm("Are you sure you want to delete this injury type?")) {
      deleteInjMutation.mutate({ id });
    }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      {/* Exercise Types Card */}
      <Card className="bg-white border border-slate-200/60 rounded-xl shadow-none">
        <CardHeader className="pb-3 border-b border-slate-100/80">
          <CardTitle className="text-sm font-semibold text-slate-900 font-sans">Exercise Types</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Input group */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Strength, Stretching..."
              className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg flex-1"
              value={newExType}
              onChange={(e) => setNewExType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateExType()}
            />
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg h-9 text-xs"
              disabled={createExMutation.isPending || !newExType.trim()}
              onClick={handleCreateExType}
            >
              Add Type
            </Button>
          </div>

          {/* List */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {exTypes.isLoading ? (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">Loading...</div>
            ) : (exTypes.data ?? []).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">No exercise types found.</div>
            ) : (
              (exTypes.data ?? []).map((type) => (
                <div key={type.id} className="p-3 text-xs text-slate-700 font-medium bg-slate-50/20 flex justify-between items-center group">
                  <span>{type.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteExType(type.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Injury Types Card */}
      <Card className="bg-white border border-slate-200/60 rounded-xl shadow-none">
        <CardHeader className="pb-3 border-b border-slate-100/80">
          <CardTitle className="text-sm font-semibold text-slate-900 font-sans">Injury Types</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Input group */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Back Pain, Shoulder Injury..."
              className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg flex-1"
              value={newInjType}
              onChange={(e) => setNewInjType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateInjType()}
            />
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg h-9 text-xs"
              disabled={createInjMutation.isPending || !newInjType.trim()}
              onClick={handleCreateInjType}
            >
              Add Type
            </Button>
          </div>

          {/* List */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {injTypes.isLoading ? (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">Loading...</div>
            ) : (injTypes.data ?? []).length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-sans">No injury types found.</div>
            ) : (
              (injTypes.data ?? []).map((type) => (
                <div key={type.id} className="p-3 text-xs text-slate-700 font-medium bg-slate-50/20 flex justify-between items-center group">
                  <span>{type.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteInjType(type.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
