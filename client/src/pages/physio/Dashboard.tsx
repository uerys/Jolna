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
import { useAuth } from "@/_core/hooks/useAuth";
import { Plus, Stethoscope, Trash2, Search, ChevronRight, AlertCircle } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <Stethoscope className="size-6 text-primary" />
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
        <TabsList>
          <TabsTrigger value="clients"><FormattedMessage id="physio.tab.clients" /></TabsTrigger>
          <TabsTrigger value="exercises"><FormattedMessage id="physio.tab.exercises" /></TabsTrigger>
          <TabsTrigger value="assignments"><FormattedMessage id="physio.tab.assignments" /></TabsTrigger>
        </TabsList>

        <TabsContent value="clients"><ClientsTab /></TabsContent>
        <TabsContent value="exercises"><ExercisesTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
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

      // Completion rate calculation (based on active completion rate logic)
      const totalActive = activeSessions.length;
      const completedSessions = activeSessions.filter((a) => {
        const start = new Date(a.assignment.startDate + "T00:00:00");
        const end = new Date(a.assignment.endDate + "T00:00:00");
        return cLogs.some((f) => {
          const logDate = new Date(f.feedback.submittedAt);
          return (
            f.feedback.assignmentId === a.assignment.id &&
            logDate >= start &&
            logDate <= end
          );
        });
      }).length;
      const completionRate = totalActive > 0 ? Math.round((completedSessions / totalActive) * 100) : null;

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
        completionRate,
        activeCount: totalActive,
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
    <div className="space-y-6 mt-4">
      {/* 1. Triage Header Horizontal Summary Banner */}
      <button
        onClick={() => setTriageFilter(triageFilter === "urgent" ? "all" : "urgent")}
        className={`text-left w-full p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          triageFilter === "urgent"
            ? "bg-rose-50 border-rose-400 shadow-md ring-2 ring-rose-500 ring-offset-2"
            : "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/10 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-0.5 font-sans">Urgent Pain Triage</h3>
            <p className="text-xs text-slate-500 font-medium font-sans">
              Clients reporting severe pain (≥7) requiring immediate clinical intervention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <div className="text-3xl font-extrabold text-slate-900">{triageStats.urgent}</div>
          <div className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider font-sans ${
            triageStats.urgent > 0 ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-500"
          }`}>
            {triageStats.urgent > 0 ? "Attention Required" : "No Alerts"}
          </div>
        </div>
      </button>

      {/* 2. Dashboard Controls */}
      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative w-full md:flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search clients by name or email..."
            className="h-8 pl-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg w-full font-normal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="w-full md:w-48 shrink-0 flex items-center gap-2 justify-end">
          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider shrink-0">Show:</span>
          <Select value={clientStatusFilter} onValueChange={(val: any) => setClientStatusFilter(val)}>
            <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-lg w-full">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 text-xs shadow-md">
              <SelectItem value="active">Undercare</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(triageFilter !== "all" || searchQuery.trim() !== "" || clientStatusFilter !== "active") && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filters:</span>
          {clientStatusFilter !== "active" && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span>Status: {clientStatusFilter === "all" ? "All" : "Suspended"}</span>
              <button onClick={() => setClientStatusFilter("active")} className="hover:text-blue-900 font-bold font-mono">×</button>
            </span>
          )}
          {triageFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span>Category: Urgent Pain</span>
              <button onClick={() => setTriageFilter("all")} className="hover:text-blue-900 font-bold font-mono">×</button>
            </span>
          )}
          {searchQuery.trim() !== "" && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
              <span>Query: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery("")} className="hover:text-blue-900 font-bold font-mono">×</button>
            </span>
          )}
        </div>
      )}

      {/* 3. Redesigned Client Cards (Horizontal list) */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
            No patients match the filter criteria.
          </div>
        ) : (
          filteredClients.map((data) => {
            const isSuspended = data.client.status !== "active";
            const painColorClass = isSuspended || data.latestPain === null
              ? "text-slate-400 bg-slate-50 border-slate-100"
              : data.latestPain >= 7
              ? "text-rose-600 bg-rose-50 border-rose-100"
              : data.latestPain >= 4
              ? "text-amber-600 bg-amber-50 border-amber-100"
              : "text-emerald-600 bg-emerald-50 border-emerald-100";

            return (
              <div
                key={data.client.id}
                className={`bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-100 transition-all flex flex-col gap-4 relative overflow-hidden group border-l-4 ${
                  data.category === "urgent"
                    ? "border-l-rose-500 bg-rose-50/5"
                    : data.category === "ontrack"
                    ? "border-l-emerald-500"
                    : "border-l-slate-300 bg-slate-50/10"
                }`}
              >
                {/* Horizontal Triage layout */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left part: Client Info */}
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                    {/* 1. Client Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-base truncate block">
                          {data.client.name ?? `Patient #${data.client.id}`}
                        </span>
                        {data.client.status !== "active" && (
                          <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 border font-semibold text-[10px]">
                            Suspended
                          </Badge>
                        )}
                        {data.client.status === "active" && (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 border font-semibold text-[10px]">
                            Undercare
                          </Badge>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs truncate block font-medium">
                        {data.client.email ?? "—"}
                      </span>
                      {data.client.status === "active" && (
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                          {data.lastLogLabel}
                        </span>
                      )}
                    </div>

                    {/* 2. Pain Level (Critical Metric) */}
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center justify-center rounded-xl px-3 py-1.5 border font-bold text-sm ${painColorClass}`}>
                        {data.latestPain !== null && data.latestPain >= 7 && (
                          <AlertCircle className="size-4 text-rose-500 mr-1.5" />
                        )}
                        <span>{data.latestPain !== null ? `${data.latestPain}/10` : "—/10"}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block sm:hidden">Pain Level</span>
                    </div>

                    {/* 3. Completion Rate */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                        Adherence
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 text-sm">
                          {data.completionRate !== null ? `${data.completionRate}%` : "No active sessions"}
                        </span>
                        {data.completionRate !== null && (
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                data.completionRate < 50 ? "bg-amber-500" : "bg-indigo-600"
                              }`}
                              style={{ width: `${data.completionRate}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Active Protocols */}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                        Active Protocols
                      </span>
                      <span className="font-extrabold text-slate-800 text-sm">
                        {data.activeCount} active protocol{data.activeCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right part: View details */}
                  <div className="flex justify-end items-center shrink-0">
                    <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 font-bold hover:bg-slate-50 gap-1 rounded-lg">
                      <Link href={`/physio/clients/${data.client.id}`}>
                        <span>View details</span>
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Smart Alert Row */}
                {data.client.status === "active" && data.alertMsg && (
                  <div className={`mt-2 border rounded-lg p-2.5 flex items-center gap-2 text-xs font-semibold ${
                    data.category === "urgent"
                      ? "bg-rose-50/50 border-rose-200 text-rose-800"
                      : "bg-amber-50/50 border-amber-200 text-amber-800"
                  }`}>
                    <AlertCircle className="size-4 text-rose-500" />
                    <span>{data.alertMsg}</span>
                  </div>
                )}
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
          <Button size="sm" onClick={() => setCreating(true)}>
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
          <Button onClick={submit}><FormattedMessage id="physio.exercise.save" /></Button>
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
              <Button size="sm"><Plus className="size-4 mr-1" /><FormattedMessage id="physio.assign.title" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle><FormattedMessage id="physio.assign.title" /></DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label><FormattedMessage id="physio.assign.client" /></Label>
                    <Select value={clientId} onValueChange={(v) => setClientId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name ?? c.email ?? `#${c.id}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label><FormattedMessage id="physio.assign.exercise" /></Label>
                    <Select value={exerciseId} onValueChange={(v) => setExerciseId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select exercise" /></SelectTrigger>
                      <SelectContent>
                        {exercises.data?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {exercisePreview && (
                  <div className="rounded border p-3 bg-muted/50 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{exercisePreview.title}</div>
                      <div className="text-sm text-muted-foreground">Default: {exercisePreview.defaultSets} sets · {exercisePreview.defaultReps} reps</div>
                    </div>
                    <div>
                      <button
                        className="text-sm text-muted-foreground px-2"
                        aria-label="Clear selected exercise"
                        onClick={() => {
                          setExerciseId("");
                          setExercisePreview(null);
                          setReps("");
                          setSets("");
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label><FormattedMessage id="physio.assign.startDate" /></Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label><FormattedMessage id="physio.assign.endDate" /></Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Injury Type</Label>
                    <Select value={injuryType} onValueChange={(v) => setInjuryType(v)}>
                      <SelectTrigger><SelectValue placeholder="Select injury type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="muscle_strain">Muscle Strain</SelectItem>
                        <SelectItem value="ligament_sprain">Ligament Sprain</SelectItem>
                        <SelectItem value="fracture_recovery">Fracture Recovery</SelectItem>
                        <SelectItem value="post_surgery">Post Surgery</SelectItem>
                        <SelectItem value="joint_pain">Joint Pain</SelectItem>
                        <SelectItem value="back_pain">Back Pain</SelectItem>
                        <SelectItem value="neck_pain">Neck Pain</SelectItem>
                        <SelectItem value="shoulder_injury">Shoulder Injury</SelectItem>
                        <SelectItem value="knee_injury">Knee Injury</SelectItem>
                        <SelectItem value="ankle_injury">Ankle Injury</SelectItem>
                        <SelectItem value="tendonitis">Tendonitis</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Exercise Type</Label>
                    <Select value={exerciseType} onValueChange={(v) => setExerciseType(v)}>
                      <SelectTrigger><SelectValue placeholder="Select exercise type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="flexibility">Flexibility</SelectItem>
                        <SelectItem value="balance">Balance</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="mobility">Mobility</SelectItem>
                        <SelectItem value="stretching">Stretching</SelectItem>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label><FormattedMessage id="physio.assign.sets" /></Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={sets as unknown as string}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSets(v === "" ? "" : Number(v));
                      }}
                    />
                  </div>
                  <div>
                    <Label><FormattedMessage id="physio.assign.reps" /></Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={reps as unknown as string}
                      onChange={(e) => {
                        const v = e.target.value;
                        setReps(v === "" ? "" : Number(v));
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}><FormattedMessage id="common.cancel" /></Button>
                <Button
                  disabled={!clientId || !exerciseId}
                  onClick={() =>
                    assign.mutate({
                      clientId: Number(clientId),
                      exerciseId: Number(exerciseId),
                      reps: (reps === "" ? undefined : Number(reps)),
                      sets: (sets === "" ? undefined : Number(sets)),
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
                  <TableHead>Client</TableHead>
                  <TableHead>Exercise</TableHead>
                      <TableHead>Sets</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6"><FormattedMessage id="common.loading" /></TableCell></TableRow>
            )}
            {assignments.data?.map((row) => (
              <TableRow key={row.assignment.id}>
                <TableCell>{row.client.name ?? row.client.email ?? `#${row.client.id}`}</TableCell>
                <TableCell>{row.exercise.title}</TableCell>
                <TableCell>{row.assignment.sets}</TableCell>
                <TableCell>{row.assignment.reps}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.assignment.startDate} → {row.assignment.endDate}</TableCell>
                <TableCell><Badge variant="outline">{row.assignment.status}</Badge></TableCell>
                <TableCell className="text-right">
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
