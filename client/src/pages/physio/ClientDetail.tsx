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
      <div className="flex justify-between text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <Calendar className="size-3 text-slate-400" />
          {formatDateShort(startDate)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3 text-slate-400" />
          {formatDateShort(endDate)}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400 font-medium">
        <span>{progressPercent}% elapsed</span>
        <span>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left</span>
      </div>
    </div>
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
  const [isNoteOpen, setIsNoteOpen] = useState(false);

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
  const [clinicalNote, setClinicalNote] = useState("");

  // Session History Filter States
  const [historyExerciseId, setHistoryExerciseId] = useState<string>("all");
  const [historyDateFrom, setHistoryDateFrom] = useState<string>("");
  const [historyDateTo, setHistoryDateTo] = useState<string>("");
  const [highPainOnly, setHighPainOnly] = useState<boolean>(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>("");

  // Exercise Assignment Filter States
  const [assignStatus, setAssignStatus] = useState<string>("all");
  const [assignCategory, setAssignCategory] = useState<string>("all");
  const [assignBodyPart, setAssignBodyPart] = useState<string>("all");
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



  const assignmentRecords = useMemo(() => {
    let list = clientAssignments.data ?? [];

    if (viewMode === "active") {
      list = list.filter((a) => a.assignment.status === "active");
    } else if (viewMode === "historical" && filterYear !== "all") {
      list = list.filter((a) => {
        const year = new Date(a.assignment.startDate).getFullYear().toString();
        return year === filterYear;
      });
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

    if (assignBodyPart !== "all") {
      list = list.filter((a) => {
        const type = a.assignment.injuryType || "";
        if (assignBodyPart === "knee") return type.includes("knee");
        if (assignBodyPart === "shoulder") return type.includes("shoulder");
        if (assignBodyPart === "ankle") return type.includes("ankle");
        if (assignBodyPart === "back") return type.includes("back");
        if (assignBodyPart === "neck") return type.includes("neck");
        if (assignBodyPart === "other") {
          return !type.includes("knee") && !type.includes("shoulder") && 
                 !type.includes("ankle") && !type.includes("back") && !type.includes("neck");
        }
        return true;
      });
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
  }, [clientAssignments.data, feedbackEnriched.data, assignSearchQuery, assignStatus, assignCategory, assignBodyPart, needsAttentionOnly, viewMode, filterYear]);

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
    let list = feedbackEnriched.data ?? [];

    if (viewMode === "historical") {
      if (filterYear !== "all") {
        list = list.filter((f) => {
          const year = new Date(f.feedback.submittedAt).getFullYear().toString();
          return year === filterYear;
        });
      }

      if (historyExerciseId !== "all") {
        list = list.filter((f) => String(f.exercise.id) === historyExerciseId);
      }

      if (historyDateFrom) {
        const fromTime = new Date(historyDateFrom + "T00:00:00").getTime();
        list = list.filter((f) => new Date(f.feedback.submittedAt).getTime() >= fromTime);
      }
      if (historyDateTo) {
        const toTime = new Date(historyDateTo + "T23:59:59").getTime();
        list = list.filter((f) => new Date(f.feedback.submittedAt).getTime() <= toTime);
      }
    }

    if (noteSearchQuery.trim()) {
      const query = noteSearchQuery.toLowerCase();
      list = list.filter((f) => f.exercise.title.toLowerCase().includes(query));
    }

    if (highPainOnly) {
      list = list.filter((f) => f.feedback.painScore >= 7);
    }

    return list;
  }, [feedbackEnriched.data, historyExerciseId, historyDateFrom, historyDateTo, noteSearchQuery, highPainOnly, viewMode, filterYear]);

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
      submittedAt: f.feedback.submittedAt,
      pain: f.feedback.painScore,
    }));
  }, [feedbackEnriched.data, viewMode]);

  const activeStats = useMemo(() => {
    const activeAssIds = new Set((clientAssignments.data ?? [])
      .filter(a => a.assignment.status === "active")
      .map(a => a.assignment.id));
    const activeFeedback = (feedbackEnriched.data ?? []).filter(f => activeAssIds.has(f.assignment.id));
    const total = activeFeedback.length;
    const completed = activeFeedback.filter(f => f.feedback.completed).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [clientAssignments.data, feedbackEnriched.data]);

  const clientInfoFields = useMemo(() => {
    return [
      { icon: Mail, label: "Email Address", value: client.data?.email ?? "—" },
      { icon: Phone, label: "Phone Number", value: client.data?.phoneNumber ?? "—" },
      { icon: Activity, label: "Primary Diagnosis", value: formatInjuryType(client.data?.injuryType) },
      { icon: CalendarDays, label: "Next Clinic Visit", value: client.data?.nextClinicVisit ? formatDateShort(client.data.nextClinicVisit) : "Not scheduled" }
    ];
  }, [client.data]);
  const sortedData = useMemo(() => {
    return [...chartData].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
  }, [chartData]);

  // Clinical SVG Chart renderer
  const svgChart = useMemo(() => {
    const firstReadingVal = sortedData[0]?.pain ?? 0;
    const latestReadingVal = sortedData[sortedData.length - 1]?.pain ?? 0;
    const isImprovedVal = latestReadingVal < firstReadingVal;
    const latestDotColorVal = isImprovedVal ? "#10b981" : "#4f46e5";
    const improvementTextVal = isImprovedVal && firstReadingVal > 0 
      ? `↓ ${Math.round(((firstReadingVal - latestReadingVal) / firstReadingVal) * 100)}% improvement` 
      : "";

    if (sortedData.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-slate-400 py-12">
          <TrendingUp className="size-8 stroke-1 mb-2 text-slate-300" />
          <p className="text-sm font-medium">No pain data recorded for this selection.</p>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = { left: 45, right: 15, top: 15, bottom: 25 };

    const getX = (index: number) => {
      if (sortedData.length <= 1) {
        return padding.left + (width - padding.left - padding.right) / 2;
      }
      return padding.left + (index * (width - padding.left - padding.right)) / (sortedData.length - 1);
    };

    const getY = (pain: number) => {
      const clampedPain = Math.max(0, Math.min(10, pain));
      return padding.top + (10 - clampedPain) * (height - padding.top - padding.bottom) / 10;
    };

    const points = sortedData.map((d, i) => `${getX(i)},${getY(d.pain)}`);
    const linePath = points.length > 0 ? `M ${points.join(" L ")}` : "";
    const areaPath = points.length > 0
      ? `${linePath} L ${getX(sortedData.length - 1)},${height - padding.bottom} L ${getX(0)},${height - padding.bottom} Z`
      : "";

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-slate-400" aria-label="Pain Trend Line Chart">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 2, 4, 6, 8, 10].map((score) => {
          const y = getY(score);
          return (
            <g key={score} className="opacity-40">
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth="0.75"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[9px] fill-slate-500 font-semibold"
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* Area under curve */}
        {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

        {/* Core Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {sortedData.map((d, i) => {
          const x = getX(i);
          const y = getY(d.pain);
          const isLast = i === sortedData.length - 1;
          const strokeColor = isLast ? latestDotColorVal : "#4f46e5";
          return (
            <g key={i} className="group/dot cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r="4"
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="2"
                className="transition-all hover:r-5 focus:outline-none"
              />
              {isLast && improvementTextVal && (
                <text
                  x={x + 10}
                  y={y - 8}
                  textAnchor="start"
                  fill="#10b981"
                  className="text-[9px] font-medium font-sans fill-emerald-600"
                >
                  {improvementTextVal}
                </text>
              )}
              <title>{`Pain Score: ${d.pain}/10 on ${new Date(d.submittedAt).toLocaleDateString()}`}</title>
            </g>
          );
        })}

        {/* Bottom dates (X Axis) */}
        {sortedData.length > 0 && [0, Math.floor(sortedData.length / 2), sortedData.length - 1].map((index) => {
          if (index >= sortedData.length) return null;
          const d = sortedData[index];
          const x = getX(index);
          const dateLabel = new Date(d.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <text
              key={index}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="text-[9px] fill-slate-500 font-medium"
            >
              {dateLabel}
            </text>
          );
        })}
      </svg>
    );
  }, [sortedData]);

  // Auth Guard
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
    toast.success(`Clinic visit scheduled for ${new Date(visitDate).toLocaleDateString()}`);
    setIsVisitOpen(false);
  };

  const handleNoteSubmit = () => {
    if (!clinicalNote.trim()) {
      toast.error("Clinical note cannot be empty.");
      return;
    }
    toast.success("Progress note successfully added to client history");
    setClinicalNote("");
    setIsNoteOpen(false);
  };

  const handleResetFilters = () => {
    setAssignStatus("all");
    setAssignCategory("all");
    setAssignBodyPart("all");
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
    ? "bg-slate-100 min-h-screen pb-12 transition-all duration-300" 
    : "bg-slate-50 min-h-screen pb-12 transition-all duration-300";

  return (
    <div className={pageBgClass}>
      <AppShell>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-indigo-600 font-semibold focus-visible:ring-indigo-600">
            <Link href="/physio" className="flex items-center gap-1">
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
        <div className="bg-white shadow-sm border border-slate-200/80 rounded-xl p-6 mb-6">
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
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {client.data?.name ?? client.data?.email ?? `Patient #${clientId}`}
                  </h1>
                  <Badge className={
                    client.data?.status === "active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50/80 border font-semibold"
                      : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-50/80 border font-semibold"
                  }>
                    {client.data?.status ?? "—"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 font-semibold">
                  ID: #{clientId} | Patient Record
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Quick Actions Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold flex items-center gap-2 py-2 px-4 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 transition-all">
                    <span>Quick Actions</span>
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-lg rounded-lg">
                  <DropdownMenuLabel className="text-xs text-slate-400 font-bold px-3 py-1.5 uppercase tracking-wider">Patient Care</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem onClick={() => setIsAssignOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Plus className="size-4 text-indigo-600" />
                    <span>Assign New Exercise</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsVisitOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Calendar className="size-4 text-indigo-600" />
                    <span>Schedule Next Visit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNoteOpen(true)} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <FileText className="size-4 text-indigo-600" />
                    <span>Log Clinical Note</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuLabel className="text-xs text-slate-400 font-bold px-3 py-1.5 uppercase tracking-wider">Contact Info</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem onClick={handleCopyContact} className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <ClipboardCopy className="size-4 text-indigo-600" />
                    <span>Copy Contact Info</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{field.label}</p>
                    <p className="font-semibold text-slate-800 truncate">{field.value}</p>
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
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === "historical" ? "Total Lifetime Adherence" : "Active Completion Rate"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const rateValue = viewMode === "historical" ? completionRate : activeStats.rate;
                return (
                  <>
                    <div className="text-3xl font-extrabold text-slate-900 mb-2">{rateValue}%</div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${rateValue}%` }} />
                    </div>
                  </>
                );
              })()}
              <p className="text-[11px] text-slate-500 font-medium">
                {viewMode === "historical"
                  ? `${stats.data?.completed ?? 0} of ${stats.data?.total ?? 0} lifetime sessions`
                  : `${activeStats.completed} of ${activeStats.total} active sessions`}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Active Exercises / Assigned Protocols */}
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === "historical" ? "Total Assigned Protocols" : "Active Protocols"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-slate-900 mb-2">
                {viewMode === "historical"
                  ? clientAssignments.data?.length ?? 0
                  : (clientAssignments.data ?? []).filter((a) => a.assignment.status === "active").length}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {viewMode === "historical"
                  ? "Including completed & discontinued plans"
                  : `${(clientAssignments.data ?? []).length} total protocols assigned`}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Latest Pain Level / Avg Pain Index */}
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
                        <span className="text-3xl font-extrabold text-slate-900">{painValue}/10</span>
                        <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          <span>{config.label}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {viewMode === "historical"
                          ? `Calculated across ${sortedData.length} lifetime logs`
                          : `Reported on ${new Date(sortedData[sortedData.length - 1].submittedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <div className="text-3xl font-extrabold text-slate-300 mb-2">—</div>
                  <p className="text-[11px] text-slate-500 font-medium">No reports logged yet</p>
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
                const last3Val = sortedData.slice(-3);
                const threeDayAvgVal = last3Val.length > 0
                  ? Math.round((last3Val.reduce((acc, d) => acc + d.pain, 0) / last3Val.length) * 10) / 10
                  : 0;

                return (
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-medium">Latest reading</span>
                      <span className="text-slate-800 text-sm font-medium">{latestReadingVal}/10</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-medium">Peak value</span>
                      <span className="text-slate-800 text-sm font-medium">{peakValueVal}/10</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5">
                      <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-medium">3-day average</span>
                      <span className="text-slate-800 text-sm font-medium">{threeDayAvgVal}/10</span>
                    </div>
                  </div>
                );
              })()
            )}

            {/* SVG area chart container */}
            <div className="h-64 sm:h-80 flex items-center justify-center">
              {svgChart}
            </div>

            {/* Horizontal Severity Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercises Grid with visual progress bar */}
        {/* Exercises Grid with visual progress bar */}
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-xl mb-6">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">Exercise Protocol Assignments</CardTitle>
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-bold text-xs py-0.5 px-2">
                {assignmentRecords.length} assigned
              </Badge>
            </div>
            <Button size="sm" onClick={() => setIsAssignOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 focus-visible:ring-indigo-600 rounded-lg shrink-0">
              <Plus className="size-4" />
              <span>Assign Exercise</span>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* Sleek, Horizontal Filter Bar for Exercise Assignments */}
            <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-lg flex flex-col md:flex-row items-center gap-2 text-xs">
              {/* Search Exercise Plans */}
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

              {/* Status Select */}
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

              {/* Body Part Select */}
              <div className="w-full md:w-32 shrink-0">
                <Select value={assignBodyPart} onValueChange={setAssignBodyPart}>
                  <SelectTrigger className="h-8 bg-white border-slate-200 text-slate-700 text-xs rounded-full">
                    <SelectValue placeholder="Body Part" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                    <SelectItem value="all">All Parts</SelectItem>
                    <SelectItem value="knee">Knee</SelectItem>
                    <SelectItem value="shoulder">Shoulder</SelectItem>
                    <SelectItem value="ankle">Ankle</SelectItem>
                    <SelectItem value="back">Back</SelectItem>
                    <SelectItem value="neck">Neck</SelectItem>
                    <SelectItem value="other">Other/General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Needs Attention Toggle */}
              <div className="flex items-center gap-2 border-l border-slate-200 pl-2 shrink-0 w-full md:w-auto justify-between md:justify-start h-8">
                <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">Needs Attention</span>
                <Switch
                  checked={needsAttentionOnly}
                  onCheckedChange={setNeedsAttentionOnly}
                  className="focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  aria-label="Toggle Needs Attention filter"
                />
              </div>
            </div>

            {/* Active Filter Pills (Soft Blue Backgrounds for Active States) */}
            {(assignStatus !== "all" || assignCategory !== "all" || assignBodyPart !== "all" || assignSearchQuery.trim() !== "" || needsAttentionOnly) && (
              <div className="flex flex-wrap items-center gap-2 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active Filters:</span>
                
                {assignSearchQuery.trim() !== "" && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span>Search: "{assignSearchQuery}"</span>
                    <button onClick={() => setAssignSearchQuery("")} className="hover:text-blue-900 font-bold font-mono" aria-label="Clear Search Filter">×</button>
                  </span>
                )}

                {assignStatus !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span>Status: {assignStatus === "completed" ? "Archived" : assignStatus === "cancelled" ? "Paused" : "Active"}</span>
                    <button onClick={() => setAssignStatus("all")} className="hover:text-blue-900 font-bold font-mono" aria-label="Clear Status Filter">×</button>
                  </span>
                )}

                {assignCategory !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span>Category: {formatExerciseType(assignCategory)}</span>
                    <button onClick={() => setAssignCategory("all")} className="hover:text-blue-900 font-bold font-mono" aria-label="Clear Category Filter">×</button>
                  </span>
                )}

                {assignBodyPart !== "all" && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span>Body Part: {assignBodyPart.charAt(0).toUpperCase() + assignBodyPart.slice(1)}</span>
                    <button onClick={() => setAssignBodyPart("all")} className="hover:text-blue-900 font-bold font-mono" aria-label="Clear Body Part Filter">×</button>
                  </span>
                )}

                {needsAttentionOnly && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span>Needs Attention</span>
                    <button onClick={() => setNeedsAttentionOnly(false)} className="hover:text-blue-900 font-bold font-mono" aria-label="Clear Attention Filter">×</button>
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
                      <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentRecords.map((a) => {
                      const statusBadgeClass = 
                        a.assignment.status === "active"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 border hover:bg-emerald-50"
                          : a.assignment.status === "completed"
                          ? "bg-indigo-50 text-indigo-800 border-indigo-200 border hover:bg-indigo-50"
                          : "bg-slate-50 text-slate-600 border-slate-200 border hover:bg-slate-50";
                      const statusLabel = 
                        a.assignment.status === "completed" 
                          ? "completed" 
                          : a.assignment.status === "cancelled" 
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
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAssignment(a.assignment.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 rounded-md focus-visible:ring-rose-500"
                              aria-label={`Delete assignment ${a.exercise.title}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
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

                  let accentClass = "border-l-4 border-l-slate-300";
                  if (a.assignment.status === "active") {
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
                              a.assignment.status === "active"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50 border font-medium text-[10px]"
                                : a.assignment.status === "completed"
                                ? "bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-50 border font-medium text-[10px]"
                                : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-50 border font-medium text-[10px]"
                            }>
                              {a.assignment.status === "completed" ? "archived" : a.assignment.status === "cancelled" ? "paused" : a.assignment.status}
                            </Badge>
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
                  <div className={`relative w-full ${viewMode === "historical" ? "md:w-1/4" : "md:w-1/2"}`}>
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search exercise plans..."
                      className="h-8 pl-8 text-xs bg-white border-slate-200 focus-visible:ring-indigo-600 rounded-lg w-full"
                      value={noteSearchQuery}
                      onChange={(e) => setNoteSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Dropdown for Exercise Template */}
                  {viewMode === "historical" && (
                    <div className="w-full md:w-1/4">
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

                  {/* High Pain Alert Toggle */}
                  <div className={`flex items-center justify-between gap-3 shrink-0 w-full md:w-auto h-8 ${viewMode === "historical" ? "border-l border-slate-200 pl-3" : ""}`}>
                    <span className="text-slate-600 font-bold tracking-tight whitespace-nowrap">High Pain (≥7)</span>
                    <Switch
                      checked={highPainOnly}
                      onCheckedChange={setHighPainOnly}
                      className="focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                      aria-label="Toggle High Pain Alert filter"
                    />
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

            <div className="my-4">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visit Date</Label>
              <Input
                type="date"
                className="h-10 mt-1 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsVisitOpen(false)} className="border-slate-200">Cancel</Button>
              <Button onClick={handleVisitSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Save Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Log Clinical Note */}
        <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
          <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-slate-950 font-bold text-lg">Log Clinical Progress Note</DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Write clinical observations or details regarding patient recovery progress.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Observations</Label>
              <Textarea
                placeholder="Enter patient diagnosis notes, range of motion improvements, or session assessments..."
                className="h-28 bg-white border-slate-200 focus:ring-indigo-600 text-slate-700"
                value={clinicalNote}
                onChange={(e) => setClinicalNote(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsNoteOpen(false)} className="border-slate-200">Cancel</Button>
              <Button onClick={handleNoteSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Record Note</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </div>
  );
}
