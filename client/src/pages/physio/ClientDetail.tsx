import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Activity,
  CalendarDays,
  MoreVertical,
  Plus,
  ClipboardCopy,
  Calendar,
  FileText,
  Trash2,
  Clock,
  Check,
  TrendingUp,
  Search,
  AlertCircle,
  Archive,
  Bone,
  Dumbbell,
  SlidersHorizontal,
} from "lucide-react";

// Types matching the schema structures
type InjuryType =
  | "muscle_strain"
  | "ligament_sprain"
  | "fracture_recovery"
  | "post_surgery"
  | "joint_pain"
  | "back_pain"
  | "neck_pain"
  | "shoulder_injury"
  | "knee_injury"
  | "ankle_injury"
  | "tendonitis"
  | "other";

type ExerciseType =
  | "strength"
  | "flexibility"
  | "balance"
  | "endurance"
  | "mobility"
  | "stretching"
  | "functional"
  | "other";

const INJURY_TYPES: readonly InjuryType[] = [
  "muscle_strain",
  "ligament_sprain",
  "fracture_recovery",
  "post_surgery",
  "joint_pain",
  "back_pain",
  "neck_pain",
  "shoulder_injury",
  "knee_injury",
  "ankle_injury",
  "tendonitis",
  "other",
];

const EXERCISE_TYPES: readonly ExerciseType[] = [
  "strength",
  "flexibility",
  "balance",
  "endurance",
  "mobility",
  "stretching",
  "functional",
  "other",
];

const PAIN_SCORE_CLASSES: Record<
  number,
  { bg: string; text: string; border: string; label: string; dot: string }
> = {
  0: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60", label: "No Pain", dot: "bg-emerald-500" },
  1: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60", label: "Mild Pain", dot: "bg-emerald-500" },
  2: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60", label: "Mild Pain", dot: "bg-emerald-500" },
  3: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60", label: "Mild Pain", dot: "bg-emerald-500" },
  4: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60", label: "Moderate Pain", dot: "bg-amber-500" },
  5: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60", label: "Moderate Pain", dot: "bg-amber-500" },
  6: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60", label: "Moderate Pain", dot: "bg-amber-500" },
  7: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60", label: "Severe Pain", dot: "bg-rose-500" },
  8: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60", label: "Severe Pain", dot: "bg-rose-500" },
  9: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60", label: "Severe Pain", dot: "bg-rose-500" },
  10: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/60", label: "Severe Pain", dot: "bg-rose-500" },
};

function getPainScoreConfig(score: number | null | undefined) {
  if (score === null || score === undefined || score < 0 || score > 10) {
    return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", label: "Unknown", dot: "bg-slate-400" };
  }
  return PAIN_SCORE_CLASSES[Math.round(score)];
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatClinicVisit(visitStr: string | null | undefined): string {
  if (!visitStr) return "Not scheduled";
  try {
    const d = new Date(visitStr);
    if (isNaN(d.getTime())) {
      const fallbackDate = new Date(visitStr + "T00:00:00");
      if (isNaN(fallbackDate.getTime())) return visitStr;
      return fallbackDate.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    }
    const datePart = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const timePart = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return `${datePart} at ${timePart}`;
  } catch {
    return visitStr;
  }
}

interface DurationBarProps {
  startDate: string;
  endDate: string;
}

function DurationBar({ startDate, endDate }: DurationBarProps) {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5));
  const elapsedDays = Math.max(0, Math.round((now.getTime() - start.getTime()) / 864e5));
  const progressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
  const daysRemaining = Math.max(0, Math.round((end.getTime() - now.getTime()) / 864e5));

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-semibold text-[#667085]">
        <span className="flex items-center gap-1">
          <Calendar className="size-3 text-[#98A2B3]" />
          {formatDateShort(startDate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-[#98A2B3]" />
          {formatDateShort(endDate)}
        </span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="progress-fill"
          style={{ width: `${progressPercent}%`, background: "#6366F1" }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[#98A2B3] font-medium">
        <span>{progressPercent}% elapsed</span>
        <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</span>
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
        <div className="flex h-full w-full flex-col items-center justify-center text-[10px] leading-tight text-[#667085]">
          <span className="font-medium text-[#344054]">
            {date.toLocaleDateString([], { month: "short", day: "numeric" })}
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

const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const pain = payload.pain;
  const color = pain >= 7 ? "#f43f5e" : pain >= 4 ? "#f59e0b" : "#10b981";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#ffffff"
      stroke={color}
      strokeWidth={2}
    />
  );
};

const CustomizedActiveDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const pain = payload.pain;
  const color = pain >= 7 ? "#f43f5e" : pain >= 4 ? "#f59e0b" : "#10b981";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );
}

export default function PhysioClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { user, loading } = useAuth();
  const intl = useIntl();
  const utils = trpc.useUtils();

  // Filters State
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Modal / Dialog States
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isVisitOpen, setIsVisitOpen] = useState(false);

  // New Exercise Form States
  const [newExerciseId, setNewExerciseId] = useState<string>("");
  const [newSets, setNewSets] = useState<string>("1");
  const [newReps, setNewReps] = useState<string>("10");
  const [newStartDate, setNewStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [newInjuryType, setNewInjuryType] = useState<string>("other");
  const [newExerciseType, setNewExerciseType] = useState<string>("other");

  // Mock visits and progress notes states
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("09:00");

  // Session History Filter States
  const [historyExerciseId, setHistoryExerciseId] = useState<string>("all");
  const [historyDateFrom, setHistoryDateFrom] = useState<string>("");
  const [historyDateTo, setHistoryDateTo] = useState<string>("");
  const [highPainOnly, setHighPainOnly] = useState<boolean>(false);
  const [showMissedDays, setShowMissedDays] = useState<boolean>(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>("");

  // Exercise Assignment Filter States
  const [assignStatus, setAssignStatus] = useState<string>("all");
  const [assignCategory, setAssignCategory] = useState<string>("all");
  const [assignInjuryType, setAssignInjuryType] = useState<string>("all");
  const [assignSearchQuery, setAssignSearchQuery] = useState<string>("");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState<boolean>(false);

  // Segmented View Toggle States
  const [viewMode, setViewMode] = useState<"active" | "historical">("active");
  const [filterYear, setFilterYear] = useState<string>("all");

  const isQueryEnabled = !!clientId && !loading && user?.role === "physiotherapist";

  // Queries using ownership-safe endpoints
  const client = trpc.physio.getClientDetail.useQuery(
    { clientId },
    { enabled: isQueryEnabled }
  );

  const clientAssignments = trpc.physio.listClientAssignments.useQuery(
    { clientId },
    { enabled: isQueryEnabled }
  );

  const feedbackEnriched = trpc.physio.listClientFeedbackEnriched.useQuery(
    {
      clientId,
      assignmentId: selectedAssignment !== "all" ? Number(selectedAssignment) : undefined,
      from: filterDateFrom || undefined,
      to: filterDateTo || undefined,
    },
    { enabled: isQueryEnabled }
  );

  const stats = trpc.physio.getClientStats.useQuery(
    { clientId },
    { enabled: isQueryEnabled }
  );

  const exercisesList = trpc.physio.listMyExercises.useQuery(
    undefined,
    { enabled: isAssignOpen && isQueryEnabled }
  );

  // Mutations
  const assignMutation = trpc.physio.assignExercise.useMutation({
    onSuccess: async () => {
      await utils.physio.listClientAssignments.invalidate();
      await utils.physio.getClientStats.invalidate();
      await utils.physio.listClientFeedbackEnriched.invalidate();
      toast.success("Exercise assigned successfully");
      setIsAssignOpen(false);
      // Reset form
      setNewExerciseId("");
      setNewSets("1");
      setNewReps("10");
      setNewStartDate(new Date().toISOString().slice(0, 10));
      setNewEndDate("");
      setNewInjuryType("other");
      setNewExerciseType("other");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to assign exercise");
    },
  });

  const deleteMutation = trpc.physio.deleteAssignment.useMutation({
    onSuccess: async () => {
      await utils.physio.listClientAssignments.invalidate();
      await utils.physio.getClientStats.invalidate();
      await utils.physio.listClientFeedbackEnriched.invalidate();
      toast.success("Assignment deleted successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete assignment");
    },
  });
  const updateStatusMutation = trpc.physio.updateAssignmentStatus.useMutation({
    onSuccess: async () => {
      await utils.physio.listClientAssignments.invalidate();
      await utils.physio.getClientStats.invalidate();
      await utils.physio.listClientFeedbackEnriched.invalidate();
      toast.success("Exercise marked as completed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const handleCompleteAssignment = (id: number) => {
    if (confirm("Are you sure you want to mark this exercise as completed?")) {
      updateStatusMutation.mutate({ id, status: "completed" });
    }
  };

  const scheduleVisitMutation = trpc.physio.scheduleNextClinicVisit.useMutation({
    onSuccess: async () => {
      await utils.physio.getClientDetail.invalidate({ clientId });
      await utils.physio.listMyClients.invalidate();
      
      const formattedTime = new Date(`2000-01-01T${visitTime}`).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      toast.success(`Clinic visit scheduled for ${new Date(visitDate).toLocaleDateString()} at ${formattedTime}`);
      setIsVisitOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule clinic visit");
    },
  });



  const assignmentRecords = useMemo(() => {
    let list = clientAssignments.data ?? [];
    const todayStr = new Date().toISOString().slice(0, 10);

    if (viewMode === "active") {
      list = list.filter((a) => a.assignment.status === "active" && a.assignment.endDate >= todayStr);
    } else if (viewMode === "historical") {
      list = list.filter((a) => a.assignment.status === "completed" || a.assignment.status === "cancelled" || a.assignment.endDate < todayStr);
      if (filterYear !== "all") {
        list = list.filter((a) => {
          const year = new Date(a.assignment.startDate).getFullYear().toString();
          return year === filterYear;
        });
      }
    }

    if (assignSearchQuery.trim()) {
      const q = assignSearchQuery.toLowerCase();
      list = list.filter((a) => a.exercise.title.toLowerCase().includes(q));
    }

    if (assignStatus !== "all") {
      list = list.filter((a) => a.assignment.status === assignStatus);
    }

    if (assignCategory !== "all") {
      list = list.filter((a) => a.assignment.exerciseType === assignCategory);
    }

    if (assignInjuryType !== "all") {
      list = list.filter((a) => a.assignment.injuryType === assignInjuryType);
    }

    if (needsAttentionOnly) {
      list = list.filter((a) => {
        const feedbackForA = (feedbackEnriched.data ?? []).filter(f => f.assignment.id === a.assignment.id);
        const hasHighPain = feedbackForA.some(f => f.feedback.painScore >= 7);
        const completedCount = feedbackForA.filter(f => f.feedback.completed).length;
        const totalCount = feedbackForA.length;
        const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : null;
        const hasLowCompletion = completionRate !== null && completionRate < 50;
        return hasHighPain || hasLowCompletion;
      });
    }

    return list;
  }, [clientAssignments.data, feedbackEnriched.data, assignSearchQuery, assignStatus, assignCategory, assignInjuryType, needsAttentionOnly, viewMode, filterYear]);

  const uniqueExercises = useMemo(() => {
    const list = clientAssignments.data ?? [];
    const seen = new Set<number>();
    const exercises: Array<{ id: number; title: string }> = [];
    for (const a of list) {
      if (!seen.has(a.exercise.id)) {
        seen.add(a.exercise.id);
        exercises.push({ id: a.exercise.id, title: a.exercise.title });
      }
    }
    return exercises;
  }, [clientAssignments.data]);

  const historyRecords = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const assignmentsList = clientAssignments.data ?? [];
    const logsList = feedbackEnriched.data ?? [];

    const missedLogs: any[] = [];
    if (showMissedDays) {
      // Loop through every assignment
      assignmentsList.forEach((a) => {
        const start = new Date(a.assignment.startDate + "T00:00:00");
        const end = new Date(a.assignment.endDate + "T00:00:00");
        const today = new Date(todayStr + "T00:00:00");

        const current = new Date(start);
        while (current <= end) {
          // Only show missed rows for dates that have already passed (current < today)
          if (current >= today) {
            break;
          }

          const currentDateStr = current.toISOString().slice(0, 10);
          
          // Check if a log exists for this assignmentId on this date
          const logExists = logsList.some((l) => {
            const logDateStr = new Date(l.feedback.submittedAt).toISOString().slice(0, 10);
            return l.feedback.assignmentId === a.assignment.id && logDateStr === currentDateStr;
          });

          if (!logExists) {
            missedLogs.push({
              feedback: {
                id: `missed-${a.assignment.id}-${currentDateStr}`,
                painScore: null,
                notes: "No log submitted",
                submittedAt: currentDateStr,
                createdAt: new Date(current),
                completed: false,
                isMissed: true,
              },
              exercise: {
                id: a.exercise.id,
                title: a.exercise.title,
              },
              assignment: {
                id: a.assignment.id,
                startDate: a.assignment.startDate,
                endDate: a.assignment.endDate,
              },
            });
          }
          current.setDate(current.getDate() + 1);
        }
      });
    }

    let combined = [
      ...(feedbackEnriched.data ?? []).map((f) => ({
        feedback: {
          ...f.feedback,
          isMissed: false,
        },
        exercise: f.exercise,
        assignment: f.assignment,
      })),
      ...missedLogs,
    ];

    if (viewMode === "historical") {
      if (filterYear !== "all") {
        combined = combined.filter((r) => {
          const year = new Date(r.feedback.submittedAt).getFullYear().toString();
          return year === filterYear;
        });
      }

      if (historyExerciseId !== "all") {
        combined = combined.filter((r) => String(r.exercise.id) === historyExerciseId);
      }

      if (historyDateFrom) {
        const fromTime = new Date(historyDateFrom + "T00:00:00").getTime();
        combined = combined.filter((r) => new Date(r.feedback.submittedAt).getTime() >= fromTime);
      }
      if (historyDateTo) {
        const toTime = new Date(historyDateTo + "T23:59:59").getTime();
        combined = combined.filter((r) => new Date(r.feedback.submittedAt).getTime() <= toTime);
      }
    }

    if (noteSearchQuery.trim()) {
      const query = noteSearchQuery.toLowerCase();
      combined = combined.filter((r) => r.exercise.title.toLowerCase().includes(query));
    }

    if (highPainOnly) {
      // Missed rows should still appear alongside the high pain rows
      combined = combined.filter((r) => r.feedback.isMissed || (r.feedback.painScore !== null && r.feedback.painScore >= 7));
    }

    // Sort all rows by date descending
    combined.sort((a, b) => new Date(b.feedback.submittedAt).getTime() - new Date(a.feedback.submittedAt).getTime());

    return combined;
  }, [feedbackEnriched.data, clientAssignments.data, historyExerciseId, historyDateFrom, historyDateTo, noteSearchQuery, highPainOnly, showMissedDays, viewMode, filterYear]);

  const chartData = useMemo(() => {
    let list = feedbackEnriched.data ?? [];
    if (viewMode === "active") {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      list = list.filter(f => new Date(f.feedback.submittedAt).getTime() >= fourteenDaysAgo.getTime());
    } else {
      const fullYearAgo = new Date();
      fullYearAgo.setDate(fullYearAgo.getDate() - 365);
      list = list.filter(f => new Date(f.feedback.submittedAt).getTime() >= fullYearAgo.getTime());
    }
    return list.map((f) => ({
      id: f.feedback.id,
      submittedAt: f.feedback.submittedAt,
      pain: f.feedback.painScore,
      notes: f.feedback.notes,
    }));
  }, [feedbackEnriched.data, viewMode]);

  const activeStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    
    // A session is considered active only if its start_date is on or before today
    const activeSessions = (clientAssignments.data ?? []).filter((a) => {
      return a.assignment.status === "active" && a.assignment.startDate <= todayStr;
    });

    const total = activeSessions.length;
    if (total === 0) {
      return { total: 0, completed: 0, rate: null };
    }

    // A session is considered completed if there is at least one feedback log inside its window (inclusive)
    const completed = activeSessions.filter((a) => {
      const start = new Date(a.assignment.startDate + "T00:00:00");
      const end = new Date(a.assignment.endDate + "T00:00:00");
      return (feedbackEnriched.data ?? []).some((f) => {
        const logDate = new Date(f.feedback.submittedAt);
        return (
          f.feedback.assignmentId === a.assignment.id &&
          logDate >= start &&
          logDate <= end
        );
      });
    }).length;

    const rate = Math.round((completed / total) * 100);
    return { total, completed, rate };
  }, [clientAssignments.data, feedbackEnriched.data]);

  const clientInfoFields = useMemo(() => {
    return [
      { icon: Mail, label: "Email Address", value: client.data?.email ?? "—" },
      { icon: Phone, label: "Phone Number", value: client.data?.phoneNumber ?? "—" },
      { icon: Activity, label: "Primary Diagnosis", value: formatInjuryType(client.data?.injuryType) },
      { icon: CalendarDays, label: "Next Clinic Visit", value: formatClinicVisit(client.data?.nextClinicVisit) }
    ];
  }, [client.data]);
  const sortedData = useMemo(() => {
    return [...chartData].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
  }, [chartData]);

  if (!loading && user?.role !== "physiotherapist" && user?.role !== "admin") {
    return (
      <AppShell>
        <Card className="bg-white border border-slate-200/80 shadow-sm max-w-xl mx-auto mt-12">
          <CardHeader>
            <CardTitle className="text-slate-900 text-lg font-bold">
              <FormattedMessage id="common.notAuthorised" />
            </CardTitle>
            <CardDescription className="text-slate-500">
              <FormattedMessage id="physio.detail.onlyPhysio" />
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  // Handlers
  const handleAssignSubmit = () => {
    if (!newExerciseId || !newStartDate || !newEndDate) {
      toast.error("Please fill in all required fields.");
      return;
    }
    assignMutation.mutate({
      exerciseId: Number(newExerciseId),
      clientId,
      sets: Number(newSets),
      reps: Number(newReps),
      startDate: newStartDate,
      endDate: newEndDate,
      injuryType: newInjuryType as InjuryType,
      exerciseType: newExerciseType as ExerciseType,
    });
  };

  const handleDeleteAssignment = (id: number) => {
    if (confirm("Are you sure you want to cancel this exercise assignment?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCopyContact = () => {
    const contactInfo = `Name: ${client.data?.name ?? "Patient"}\nEmail: ${client.data?.email ?? "—"}\nPhone: ${client.data?.phoneNumber ?? "—"}`;
    navigator.clipboard.writeText(contactInfo);
    toast.success("Patient contact information copied to clipboard");
  };

  const handleVisitSubmit = () => {
    if (!visitDate) {
      toast.error("Please select a date.");
      return;
    }
    const visitDateTime = visitTime ? `${visitDate}T${visitTime}` : visitDate;
    scheduleVisitMutation.mutate({
      clientId,
      nextClinicVisit: visitDateTime,
    });
  };


  const handleResetFilters = () => {
    setAssignStatus("all");
    setAssignCategory("all");
    setAssignInjuryType("all");
    setAssignSearchQuery("");
    setNeedsAttentionOnly(false);
  };
  const completionRate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  const avgPain = useMemo(() => {
    if (sortedData.length === 0) return 0;
    const total = sortedData.reduce((acc, d) => acc + d.pain, 0);
    return Math.round((total / sortedData.length) * 10) / 10;
  }, [sortedData]);

  const chartDateRangeStr = useMemo(() => {
    if (sortedData.length === 0) return "No data";
    const startD = new Date(sortedData[0].submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const endD = new Date(sortedData[sortedData.length - 1].submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${startD} – ${endD}`;
  }, [sortedData]);
  const pageBgClass = viewMode === "historical" 
    ? "bg-[#F2F4F7] min-h-screen pb-12 transition-all duration-300" 
    : "bg-[#F8FAFC] min-h-screen pb-12 transition-all duration-300";

  return (
    <div className={pageBgClass}>
      <AppShell>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 rounded-lg transition-all">
            <Link href="/physio" className="flex items-center gap-1.5">
              <ArrowLeft className="size-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
          {/* Segmented View Toggle Control */}
          <div className="flex justify-center sm:justify-start">
            <div className="inline-flex p-1 bg-slate-200/50 border border-slate-200/80 rounded-xl shadow-inner select-none gap-1">
              <button
                onClick={() => setViewMode("active")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                  viewMode === "active"
                    ? "bg-white text-indigo-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/30"
                }`}
              >
                Active Treatment
              </button>
              <button
                onClick={() => setViewMode("historical")}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                  viewMode === "historical"
                    ? "bg-white text-indigo-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/30"
                }`}
              >
                Full Historical Record
              </button>
            </div>
          </div>
        </div>

        {/* Visual Cue Warning Banner for Historical Mode */}
        {viewMode === "historical" && (
          <div className="mb-6 bg-slate-200/80 border border-slate-300 text-slate-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs transition-all duration-300">
            <Archive className="size-4 text-slate-500 shrink-0" />
            <span>Viewing Full Historical Record — Displaying past clinical plans, discontinued exercises, and full year adherence data.</span>
          </div>
        )}

        {/* Detailed Client Header Card */}
        <div className="bg-white shadow-sm border border-[#E4E7EC] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-slate-200/80 shadow-sm flex items-center justify-center bg-indigo-50 text-indigo-700 rounded-full">
                <AvatarFallback className="text-xl font-bold bg-indigo-50 text-indigo-700">
                  {client.data?.name
                    ? client.data.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "PT"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-[#101828] tracking-tight">
                    {client.data?.name ?? client.data?.email ?? `Patient #${clientId}`}
                  </h1>
                  <Badge className={
                    client.data?.status === "active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50/80 border font-semibold"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100/80 border font-semibold"
                  }>
                    {client.data?.status === "active" ? "Undercare" : client.data?.status ? "Suspended" : "—"}
                  </Badge>
                </div>
                <p className="text-xs text-[#98A2B3] font-medium">
                  ID: #{clientId} · Patient Record
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {viewMode === "historical" ? (
                /* Historical mode: direct Copy Contact Info button */
                <Button
                  onClick={handleCopyContact}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold flex items-center gap-2 py-2 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 transition-all"
                >
                  <ClipboardCopy className="size-4" />
                  <span>Copy Contact Info</span>
                </Button>
              ) : (
                /* Active mode: full Quick Actions dropdown */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold flex items-center gap-2 py-2 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 transition-all">
                      <span>Quick Actions</span>
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border border-[#E4E7EC] shadow-lg rounded-xl">
                    <DropdownMenuLabel className="text-[10px] text-[#98A2B3] font-semibold px-3 py-1.5 uppercase tracking-widest">Patient Care</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#F2F4F7]" />
                    <DropdownMenuItem onClick={() => setIsAssignOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-[#344054] hover:bg-[#F8FAFC]">
                      <Plus className="size-4 text-indigo-600" />
                      <span>Assign New Exercise</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsVisitOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-[#344054] hover:bg-[#F8FAFC]">
                      <Calendar className="size-4 text-indigo-600" />
                      <span>Schedule Next Visit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#F2F4F7]" />
                    <DropdownMenuLabel className="text-[10px] text-[#98A2B3] font-semibold px-3 py-1.5 uppercase tracking-widest">Contact Info</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#F2F4F7]" />
                    <DropdownMenuItem onClick={handleCopyContact} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-[#344054] hover:bg-[#F8FAFC]">
                      <ClipboardCopy className="size-4 text-indigo-600" />
                      <span>Copy Contact Info</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Contact Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
            {clientInfoFields.map((field, index) => {
              const IconComponent = field.icon;
              return (
                <div key={index} className="flex items-center gap-3 text-slate-700">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                    <IconComponent className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">{field.label}</p>
                    <p className="font-semibold text-[#101828] truncate text-sm">{field.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Row */}
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Completion Rate / Adherence */}
          <Card className="bg-white border border-[#E4E7EC] shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">
                {viewMode === "historical" ? "Total Lifetime Adherence" : "Active Completion Rate"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                if (viewMode === "active" && activeStats.rate === null) {
                  return (
                    <>
                      <div className="text-sm font-semibold text-[#667085] mb-4 h-[30px] flex items-center">
                        No active sessions
                      </div>
                      <div className="progress-track mb-1">
                        <div className="progress-fill" style={{ width: "0%", background: "#6366F1" }} />
                      </div>
                    </>
                  );
                }
                const rateValue = viewMode === "historical" ? completionRate : activeStats.rate;
                return (
                  <>
                    <div className="text-3xl font-bold text-[#101828] mb-2 tabular-nums">{rateValue}%</div>
                    <div className="progress-track mb-1">
                      <div className="progress-fill" style={{ width: `${rateValue}%`, background: "#6366F1" }} />
                    </div>
                  </>
                );
              })()}
              <p className="text-[11px] text-[#667085] font-medium">
                {viewMode === "historical"
                  ? `${stats.data?.completed ?? 0} of ${stats.data?.total ?? 0} lifetime sessions`
                  : `${activeStats.completed} of ${activeStats.total} active sessions`}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Active Exercises / Assigned Exercises */}
          <Card className="bg-white border border-[#E4E7EC] shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">
                {viewMode === "historical" ? "Total Assigned Exercises" : "Active Exercises"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#101828] mb-2 tabular-nums">
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  return viewMode === "historical"
                    ? clientAssignments.data?.length ?? 0
                    : (clientAssignments.data ?? []).filter((a) => a.assignment.status === "active" && a.assignment.endDate >= todayStr).length;
                })()}
              </div>
              <p className="text-[11px] text-[#667085] font-medium">
                {viewMode === "historical"
                  ? "Including completed & discontinued exercises"
                  : (() => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const activeCount = (clientAssignments.data ?? []).filter((a) => a.assignment.status === "active" && a.assignment.endDate >= todayStr).length;
                      return `${activeCount} active exercise${activeCount !== 1 ? "s" : ""}`;
                    })()}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Latest Pain Level / Avg Pain Index */}
          <Card className="bg-white border border-[#E4E7EC] shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">
                {viewMode === "historical" ? "Average Pain Index" : "Latest Pain Level"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedData.length > 0 ? (
                (() => {
                  const painValue = viewMode === "historical" ? avgPain : sortedData[sortedData.length - 1].pain;
                  const config = getPainScoreConfig(painValue);
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-[#101828] tabular-nums">{painValue}/10</span>
                        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          <span>{config.label}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#667085] font-medium">
                        {viewMode === "historical"
                          ? `Calculated across ${sortedData.length} lifetime logs`
                          : `Reported on ${new Date(sortedData[sortedData.length - 1].submittedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <div className="text-3xl font-bold text-[#E4E7EC] mb-2">—</div>
                  <p className="text-[11px] text-[#667085] font-medium">No reports logged yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Filters Card (Top) */}
        <Card className="bg-white border border-slate-200/60 rounded-xl shadow-none mb-6">
          <CardHeader className="pb-3 border-b border-slate-100/80 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-slate-400" />
              <CardTitle className="text-sm font-medium text-slate-900">Dashboard filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {viewMode === "historical" ? (
              /* Historical Mode Filters */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-[11px] font-medium tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <Calendar className="size-3 text-slate-400" />
                    <span>Filter by year</span>
                  </Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-9 bg-white border-slate-200 focus:ring-indigo-600 rounded-lg text-xs font-normal">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                      <SelectItem value="all">All years</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div />
              </div>
            ) : (
              /* Active Mode Filters */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-[11px] font-medium tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <ClipboardCopy className="size-3 text-slate-400" />
                    <span>Assignment filter</span>
                  </Label>
                  <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                    <SelectTrigger className="h-9 bg-white border-slate-200 focus:ring-indigo-600 rounded-lg text-xs font-normal">
                      <SelectValue placeholder="All assignments" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
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
                  <Label className="text-[11px] font-medium tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <Calendar className="size-3 text-slate-400" />
                    <span>Date range</span>
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="date"
                      className="h-9 text-xs bg-white border-slate-200 focus:ring-indigo-600 rounded-lg text-slate-700 w-full font-normal"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                    <span className="text-slate-400 font-normal shrink-0">to</span>
                    <Input
                      type="date"
                      className="h-9 text-xs bg-white border-slate-200 focus:ring-indigo-600 rounded-lg text-slate-700 w-full font-normal"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Reset and Apply Buttons */}
            <div className="flex justify-end items-center gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="h-9 text-xs text-slate-500 hover:text-slate-900 rounded-lg font-normal"
              >
                Reset
              </Button>
              <Button
                onClick={() => {
                  toast.success("Filters applied successfully");
                }}
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium px-4"
              >
                Apply filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pain Trend Card (Below) */}
        <Card className="bg-white border border-slate-200/60 rounded-xl shadow-none mb-6">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-slate-900 font-sans">Pain trend</CardTitle>
              <p className="text-xs text-slate-400 font-normal">
                {chartDateRangeStr}
              </p>
            </div>
            {sortedData.length > 0 && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                Clinical overview
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Summary Stat Pills */}
            {sortedData.length > 0 && (
              (() => {
                const latestReadingVal = sortedData[sortedData.length - 1].pain;
                const peakValueVal = Math.max(...sortedData.map((d) => d.pain));
                const latestDate = sortedData.length > 0 ? new Date(sortedData[sortedData.length - 1].submittedAt) : null;
                const threeDaysAgo = latestDate ? new Date(latestDate.getTime() - 3 * 24 * 60 * 60 * 1000) : null;
                const last3DaysEntries = latestDate && threeDaysAgo
                  ? sortedData.filter(d => new Date(d.submittedAt) >= threeDaysAgo)
                  : [];
                const threeDayAvgVal = last3DaysEntries.length > 0
                  ? Math.round((last3DaysEntries.reduce((acc, d) => acc + d.pain, 0) / last3DaysEntries.length) * 10) / 10
                  : 0;

                return (
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-[#667085]">
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">Latest reading</span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">{latestReadingVal}/10</span>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">Peak value</span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">{peakValueVal}/10</span>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">3-day average</span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">{threeDayAvgVal}/10</span>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Recharts area chart container */}
            <div className="h-80 md:h-[24rem] lg:h-[28rem] w-full flex flex-col justify-between">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sortedData}
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
                      dot={<CustomizedDot />}
                      activeDot={<CustomizedActiveDot />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Horizontal Severity Bar aligned with Recharts grid */}
              <div className="space-y-1.5 pt-4 ml-[34px] mr-[24px] shrink-0">
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                <div className="flex justify-between text-[10px] font-medium text-[#98A2B3]">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Exercises Grid with visual progress bar */}
        {/* Exercises Grid with visual progress bar */}
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl mb-6">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-[#101828]">
                {viewMode === "historical" ? "Completed Exercise" : "Exercise Protocol Assignments"}
              </CardTitle>
              <Badge className="bg-[#F2F4F7] text-[#667085] hover:bg-[#F2F4F7] border-none font-semibold text-[10px] py-0.5 px-2">
                {assignmentRecords.length} {viewMode === "historical" ? "completed" : "assigned"}
              </Badge>
            </div>
            {viewMode === "active" && (
              <Button size="sm" onClick={() => setIsAssignOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 focus-visible:ring-indigo-600 rounded-lg shrink-0">
                <Plus className="size-4" />
                <span>Assign Exercise</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Sleek, Horizontal Filter Bar for Exercise Assignments */}
            <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-lg flex flex-col md:flex-row items-center gap-2 text-xs">
              {/* Search Exercise Plans */}
              {viewMode === "active" && (
                <div className="relative flex-1 w-full min-w-[150px]">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search Exercise Plans..."
                    className="h-8 pl-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg w-full font-normal"
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                  />
                </div>
              )}

              {/* Status Select */}
              {viewMode === "active" && (
                <div className="w-full md:w-32 shrink-0">
                  <Select value={assignStatus} onValueChange={setAssignStatus}>
                    <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Archived</SelectItem>
                      <SelectItem value="cancelled">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category Select */}
              <div className="w-full md:w-32 shrink-0">
                <Select value={assignCategory} onValueChange={setAssignCategory}>
                  <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                    <SelectItem value="stretching">Stretching</SelectItem>
                    <SelectItem value="functional">Functional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Injury Type Select */}
              <div className="w-full md:w-36 shrink-0">
                <Select value={assignInjuryType} onValueChange={setAssignInjuryType}>
                  <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-full">
                    <SelectValue placeholder="Injury Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                    <SelectItem value="all">All Injury Types</SelectItem>
                    {INJURY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatInjuryType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Needs Attention Toggle */}
              {viewMode === "active" && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-2 shrink-0 w-full md:w-auto justify-between md:justify-start h-8">
                  <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Needs Attention</span>
                  <Switch
                    checked={needsAttentionOnly}
                    onCheckedChange={setNeedsAttentionOnly}
                    className="focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                    aria-label="Toggle Needs Attention filter"
                  />
                </div>
              )}
            </div>

            {/* Active Filter Pills (Soft Blue Backgrounds for Active States) */}
            {(assignStatus !== "all" || assignCategory !== "all" || assignInjuryType !== "all" || assignSearchQuery.trim() !== "" || needsAttentionOnly) && (
              <div className="flex flex-wrap items-center gap-2 py-1">
                <span className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest mr-1">Active Filters:</span>
                
                {assignSearchQuery.trim() !== "" && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    <span>Search: &ldquo;{assignSearchQuery}&rdquo;</span>
                    <button onClick={() => setAssignSearchQuery("")} className="hover:text-indigo-900 font-bold leading-none ml-0.5" aria-label="Clear Search Filter">×</button>
                  </span>
                )}

                {assignStatus !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    <span>Status: {assignStatus === "completed" ? "Archived" : assignStatus === "cancelled" ? "Paused" : "Active"}</span>
                    <button onClick={() => setAssignStatus("all")} className="hover:text-indigo-900 font-bold leading-none ml-0.5" aria-label="Clear Status Filter">×</button>
                  </span>
                )}

                {assignCategory !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    <span>Category: {formatExerciseType(assignCategory)}</span>
                    <button onClick={() => setAssignCategory("all")} className="hover:text-indigo-900 font-bold leading-none ml-0.5" aria-label="Clear Category Filter">×</button>
                  </span>
                )}

                {assignInjuryType !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    <span>Injury Type: {formatInjuryType(assignInjuryType)}</span>
                    <button onClick={() => setAssignInjuryType("all")} className="hover:text-indigo-900 font-bold leading-none ml-0.5" aria-label="Clear Injury Type Filter">×</button>
                  </span>
                )}

                {needsAttentionOnly && (
                  <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                    <span>Needs Attention</span>
                    <button onClick={() => setNeedsAttentionOnly(false)} className="hover:text-rose-900 font-bold leading-none ml-0.5" aria-label="Clear Attention Filter">×</button>
                  </span>
                )}

                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors ml-1"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Assignments List / Empty State */}
            {assignmentRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl min-h-[200px]">
                <Activity className="size-8 text-slate-400 mb-2 stroke-[1.5]" />
                <h3 className="text-sm font-extrabold text-slate-700 mb-1">No matching protocols</h3>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Try adjusting your status, category, or search filters to find the patient's assigned exercises.
                </p>
                <Button
                  size="sm"
                  onClick={handleResetFilters}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-1.5 rounded-lg focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                >
                  Isolate Filters
                </Button>
              </div>
            ) : viewMode === "historical" ? (
              /* Historical View: Detailed Protocols Table */
              <div className="overflow-x-auto rounded-lg border border-slate-200/60 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-b border-slate-200/60">
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Exercise Plan</TableHead>
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Injury Class</TableHead>
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Exercise Class</TableHead>
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Protocol Window</TableHead>
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Sets × Reps</TableHead>
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</TableHead>
                      {/* Actions column hidden in historical record view */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentRecords.map((a) => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const isFinished = a.assignment.status === "completed" || a.assignment.endDate < todayStr;
                      const isCancelled = a.assignment.status === "cancelled";
                      const statusBadgeClass = 
                        isFinished
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200 border hover:bg-indigo-50"
                          : isCancelled
                          ? "bg-slate-50 text-slate-600 border-slate-200 border hover:bg-slate-50"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200 border hover:bg-emerald-50";
                      const statusLabel = 
                        isFinished 
                          ? "completed" 
                          : isCancelled 
                          ? "discontinued" 
                          : "active";

                      return (
                        <TableRow key={a.assignment.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                          <TableCell className="font-bold text-slate-900 text-sm">{a.exercise.title}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{formatInjuryType(a.assignment.injuryType)}</TableCell>
                          <TableCell className="text-slate-600 text-sm">{formatExerciseType(a.assignment.exerciseType)}</TableCell>
                          <TableCell className="text-slate-500 text-xs font-semibold font-mono">
                            {formatDateShort(a.assignment.startDate)} → {formatDateShort(a.assignment.endDate)}
                          </TableCell>
                          <TableCell className="text-slate-800 text-sm font-semibold font-mono">{a.assignment.sets} × {a.assignment.reps}</TableCell>
                          <TableCell>
                            <Badge className={`${statusBadgeClass} font-bold text-[10px]`}>
                              {statusLabel}
                            </Badge>
                          </TableCell>
                      {/* Actions cell hidden in historical record view */}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Active View: Protocol Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignmentRecords.map((a) => {
                  const feedbackForA = (feedbackEnriched.data ?? []).filter(f => f.assignment.id === a.assignment.id);
                  const hasHighPain = feedbackForA.some(f => f.feedback.painScore >= 7);
                  const completedCount = feedbackForA.filter(f => f.feedback.completed).length;
                  const totalCount = feedbackForA.length;
                  const completionRateValue = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null;
                  const hasLowCompletion = completionRateValue !== null && completionRateValue < 50;
                  const cardNeedsAttention = hasHighPain || hasLowCompletion;

                  let alertReason = "";
                  if (hasHighPain && hasLowCompletion) {
                    alertReason = "High Pain & Low Completion";
                  } else if (hasHighPain) {
                    alertReason = "High Pain Alert";
                  } else if (hasLowCompletion) {
                    alertReason = `Low Completion (${completionRateValue}%)`;
                  }

                  const end = new Date(a.assignment.endDate + "T00:00:00");
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 864e5);

                  let daysLeftBadge = null;
                  if (daysLeft < 0) {
                    daysLeftBadge = (
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 border hover:bg-rose-50 font-medium text-[10px] rounded-lg">
                        Overdue
                      </Badge>
                    );
                  } else if (daysLeft <= 7) {
                    daysLeftBadge = (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-medium text-[10px] rounded-lg">
                        {daysLeft} days left
                      </Badge>
                    );
                  } else {
                    daysLeftBadge = (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-medium text-[10px] rounded-lg">
                        {daysLeft} days left
                      </Badge>
                    );
                  }

                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isFinished = a.assignment.status === "completed" || a.assignment.endDate < todayStr;
                  const isCancelled = a.assignment.status === "cancelled";

                  let accentClass = "border-l-4 border-l-slate-300";
                  if (a.assignment.status === "active" && !isFinished) {
                    accentClass = "border-l-4 border-l-emerald-500";
                  }
                  if (cardNeedsAttention) {
                    accentClass = "border-l-4 border-l-amber-500";
                  }

                  const cardClass = `border border-slate-200/75 ${accentClass} rounded-xl p-4 bg-white hover:shadow-md transition-all flex flex-col justify-between group`;

                  return (
                    <div key={a.assignment.id} className={cardClass}>
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-slate-800 text-base tracking-tight leading-snug">
                            {a.exercise.title}
                          </h4>
                          <div className="flex gap-1.5 shrink-0 items-center">
                            {daysLeftBadge}
                            <Badge className={
                              isFinished
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-50 border font-medium text-[10px]"
                                : isCancelled
                                ? "bg-slate-800 text-slate-800 border-slate-200 hover:bg-slate-50 border font-medium text-[10px]"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 border font-medium text-[10px]"
                            }>
                              {isFinished ? "completed" : isCancelled ? "paused" : "active"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCompleteAssignment(a.assignment.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600 rounded-md focus-visible:ring-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              aria-label={`Complete assignment ${a.exercise.title}`}
                            >
                              <Check className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAssignment(a.assignment.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 rounded-md focus-visible:ring-rose-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              aria-label={`Delete assignment ${a.exercise.title}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {cardNeedsAttention && (
                          <div className="mb-3 bg-amber-50 border border-amber-200/80 rounded-lg p-2 flex items-center gap-1.5 text-xs text-amber-800 font-bold">
                            <AlertCircle className="size-3.5 text-amber-600 shrink-0 animate-pulse" />
                            <span>Attention: {alertReason}</span>
                          </div>
                        )}

                        {(() => {
                          const cardFields = [
                            { label: "Injury Type", value: formatInjuryType(a.assignment.injuryType) },
                            { label: "Exercise Type", value: formatExerciseType(a.assignment.exerciseType) },
                            { label: "Sets & Reps", value: `${a.assignment.sets} × ${a.assignment.reps}` },
                            { label: "Assigned", value: new Date(a.assignment.createdAt).toLocaleDateString() }
                          ].filter((field) => {
                            const val = field.value?.trim().toLowerCase();
                            return val && val !== "other" && val !== "—" && val !== "";
                          });

                          if (cardFields.length === 0) return null;

                          return (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-slate-100 pt-2.5 pb-0.5 mb-2">
                              {cardFields.map((field, idx) => (
                                <div key={idx}>
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{field.label}</span>
                                  <p className="font-medium text-slate-800 text-sm mt-0.5">{field.value}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      <DurationBar startDate={a.assignment.startDate} endDate={a.assignment.endDate} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session History Table */}
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              <FormattedMessage id="physio.monitor.history" />
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Detailed session feedback history ({historyRecords.length} logs matching filters)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {(feedbackEnriched.data ?? []).length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FormattedMessage id="physio.monitor.noData" />
              </div>
            ) : (
              <>
                {/* Compact, horizontal filter bar */}
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs">

                  {/* Search Bar for notes */}
                  {viewMode === "active" && (
                    <div className="relative w-full md:w-1/2">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search exercise plans..."
                        className="h-8 pl-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg w-full font-normal"
                        value={noteSearchQuery}
                        onChange={(e) => setNoteSearchQuery(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Dropdown for Exercise Template */}
                  {viewMode === "historical" && (
                    <div className="w-full md:w-1/3">
                      <Select value={historyExerciseId} onValueChange={setHistoryExerciseId}>
                        <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-lg">
                          <SelectValue placeholder="All Exercises" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 text-xs shadow-md">
                          <SelectItem value="all">All Exercises</SelectItem>
                          {uniqueExercises.map((ex) => (
                            <SelectItem key={ex.id} value={String(ex.id)}>
                              {ex.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Date Range Selector */}
                  {viewMode === "historical" && (
                    <div className="flex items-center gap-1.5 w-full md:w-1/3">
                      <Input
                        type="date"
                        className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-slate-700 w-full"
                        value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        aria-label="Filter Date From"
                      />
                      <span className="text-slate-400 font-semibold shrink-0">to</span>
                      <Input
                        type="date"
                        className="h-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg text-slate-700 w-full"
                        value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        aria-label="Filter Date To"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto">
                    {/* High Pain Alert Toggle */}
                    <div className={`flex items-center justify-between gap-3 shrink-0 h-8 ${viewMode === "historical" ? "border-l border-slate-200 pl-3" : ""}`}>
                      <span className="text-slate-600 font-bold tracking-tight whitespace-nowrap">High Pain (≥7)</span>
                      <Switch
                        checked={highPainOnly}
                        onCheckedChange={setHighPainOnly}
                        className="focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        aria-label="Toggle High Pain Alert filter"
                      />
                    </div>

                    {/* Show Missed Days Toggle */}
                    <div className="flex items-center justify-between gap-3 shrink-0 h-8 border-l border-slate-200 pl-3">
                      <span className="text-slate-600 font-bold tracking-tight whitespace-nowrap">Show missed days</span>
                      <Switch
                        checked={showMissedDays}
                        onCheckedChange={setShowMissedDays}
                        className="focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                        aria-label="Toggle Show Missed Days filter"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Container */}
                {historyRecords.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-400 text-center py-8">
                    No session logs match the selected filter criteria.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-b border-slate-200/60">
                          <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Exercise Plan</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Logged Date</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pain score</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Completion</TableHead>
                          <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">Patient Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyRecords.map((f) => {
                          if (f.feedback.isMissed) {
                            return (
                              <TableRow key={f.feedback.id} className="border-b border-slate-100 bg-rose-50/5 hover:bg-rose-50/10 transition-colors">
                                <TableCell className="font-semibold text-slate-800 text-sm">{f.exercise.title}</TableCell>
                                <TableCell className="text-slate-400 text-xs font-semibold font-mono">
                                  {new Date(f.feedback.submittedAt + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "short" })}
                                </TableCell>
                                <TableCell className="text-slate-400 font-semibold">—</TableCell>
                                <TableCell>
                                  <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 border font-bold text-xs w-fit">
                                    Missed
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-400 italic font-normal min-w-[300px]">
                                  No log submitted
                                </TableCell>
                              </TableRow>
                            );
                          }
                          const painConfig = getPainScoreConfig(f.feedback.painScore);
                          const isHighPain = f.feedback.painScore >= 7;
                          const rowClass = isHighPain
                            ? "border-b border-slate-100 bg-rose-50/20 hover:bg-rose-50/30 border-l-2 border-l-rose-500 transition-colors"
                            : "border-b border-slate-100 hover:bg-slate-50/40 transition-colors";
                          return (
                            <TableRow key={f.feedback.id} className={rowClass}>
                              <TableCell className="font-semibold text-slate-800 text-sm">{f.exercise.title}</TableCell>
                              <TableCell className="text-slate-400 text-xs font-semibold font-mono">
                                {new Date(f.feedback.submittedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                              </TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${painConfig.bg} ${painConfig.text} ${painConfig.border}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${painConfig.dot}`} aria-hidden="true" />
                                  <span>{f.feedback.painScore}/10</span>
                                  <span className="sr-only">({painConfig.label})</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {f.feedback.completed ? (
                                  <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border-emerald-200 border font-bold text-xs flex items-center gap-1 w-fit">
                                    <Check className="size-3" />
                                    <span>Completed</span>
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-50 text-slate-500 hover:bg-slate-50 border-slate-200 border font-bold text-xs w-fit">
                                    Missed
                                  </Badge>
                                 )}
                              </TableCell>
                              <TableCell className="text-slate-500 text-sm font-medium min-w-[300px] whitespace-pre-wrap">
                                {f.feedback.notes ?? <span className="text-slate-300 font-normal">No notes logged</span>}
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     </Table>
                   </div>
                 )}
               </>
             )}
          </CardContent>
        </Card>

        {/* Dialog: Assign Exercise */}
        <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
          <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-slate-950 font-bold text-lg">Assign Exercise Plan</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Create a customized exercise task assigned to this patient.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Exercise Template</Label>
                <Select value={newExerciseId} onValueChange={setNewExerciseId}>
                  <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                    <SelectValue placeholder="Choose exercise template" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-md">
                    {(exercisesList.data ?? []).map((ex) => (
                      <SelectItem key={ex.id} value={String(ex.id)}>
                        {ex.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reps Count</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                    value={newReps}
                    onChange={(e) => setNewReps(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sets Count</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                    value={newSets}
                    onChange={(e) => setNewSets(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Injury Type</Label>
                  <Select value={newInjuryType} onValueChange={setNewInjuryType}>
                    <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                      <SelectValue placeholder="Injury Class" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-md">
                      {INJURY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{formatInjuryType(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exercise Type</Label>
                  <Select value={newExerciseType} onValueChange={setNewExerciseType}>
                    <SelectTrigger className="h-10 mt-1 bg-white border-slate-200 text-slate-700">
                      <SelectValue placeholder="Exercise Class" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-md">
                      {EXERCISE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{formatExerciseType(t)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsAssignOpen(false)} className="border-slate-200 focus:ring-slate-400">Cancel</Button>
              <Button onClick={handleAssignSubmit} disabled={assignMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold focus-visible:ring-indigo-600">
                {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Schedule Next Visit */}
        <Dialog open={isVisitOpen} onOpenChange={setIsVisitOpen}>
          <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-slate-950 font-bold text-lg">Schedule Clinic Visit</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Set the next calendar date for this patient to visit the clinic.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-sans">
                  Visit Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 size-4 text-slate-400" />
                  <Input
                    type="date"
                    className="h-10 pl-10 bg-white border-slate-200 focus-visible:ring-indigo-600 text-slate-700 w-full rounded-lg text-sm"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-sans">
                  Visit Time
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 size-4 text-slate-400" />
                  <Input
                    type="time"
                    className="h-10 pl-10 bg-white border-slate-200 focus-visible:ring-indigo-600 text-slate-700 w-full rounded-lg text-sm"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsVisitOpen(false)} className="border-slate-200">Cancel</Button>
              <Button onClick={handleVisitSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Save Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </AppShell>
    </div>
  );
}
