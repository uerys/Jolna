import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { formatPrescriptionShort } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMobile";
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
  TrendingUp,
  Search,
  SlidersHorizontal,
  CalendarDays,
  ClipboardCopy,
  Activity,
  Check,
  Calendar as CalendarIcon,
  MessageSquare,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

const PAIN_SCORE_CLASSES: Record<
  number,
  { bg: string; text: string; border: string; label: string; dot: string }
> = {
  0: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    label: "No Pain",
    dot: "bg-emerald-500",
  },
  1: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    label: "Mild Pain",
    dot: "bg-emerald-500",
  },
  2: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    label: "Mild Pain",
    dot: "bg-emerald-500",
  },
  3: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    label: "Mild Pain",
    dot: "bg-emerald-500",
  },
  4: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/60",
    label: "Moderate Pain",
    dot: "bg-amber-500",
  },
  5: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/60",
    label: "Moderate Pain",
    dot: "bg-amber-500",
  },
  6: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200/60",
    label: "Moderate Pain",
    dot: "bg-amber-500",
  },
  7: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200/60",
    label: "Severe Pain",
    dot: "bg-rose-500",
  },
  8: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200/60",
    label: "Severe Pain",
    dot: "bg-rose-500",
  },
  9: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200/60",
    label: "Severe Pain",
    dot: "bg-rose-500",
  },
  10: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200/60",
    label: "Severe Pain",
    dot: "bg-rose-500",
  },
};

function getPainLabel(label: string, intl: any): string {
  switch (label) {
    case "No Pain":
      return intl.formatMessage({
        id: "pain.noPain",
        defaultMessage: "No Pain",
      });
    case "Mild Pain":
      return intl.formatMessage({
        id: "pain.mildPain",
        defaultMessage: "Mild Pain",
      });
    case "Moderate Pain":
      return intl.formatMessage({
        id: "pain.moderatePain",
        defaultMessage: "Moderate Pain",
      });
    case "Severe Pain":
      return intl.formatMessage({
        id: "pain.severePain",
        defaultMessage: "Severe Pain",
      });
    default:
      return label;
  }
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

const CustomizedDot = ({
  cx,
  cy,
  payload,
}: {
  cx: number;
  cy: number;
  payload: { pain: number };
}) => {
  const config = PAIN_SCORE_CLASSES[Math.round(payload.pain)] || {
    dot: "bg-slate-400",
  };
  const color =
    config.dot === "bg-emerald-500"
      ? "#10b981"
      : config.dot === "bg-amber-500"
        ? "#f59e0b"
        : "#f43f5e";
  return (
    <circle cx={cx} cy={cy} r={3} strokeWidth={2} stroke="white" fill={color} />
  );
};

const CustomizedActiveDot = ({
  cx,
  cy,
  payload,
}: {
  cx: number;
  cy: number;
  payload: { pain: number };
}) => {
  const config = PAIN_SCORE_CLASSES[Math.round(payload.pain)] || {
    dot: "bg-slate-400",
  };
  const color =
    config.dot === "bg-emerald-500"
      ? "#10b981"
      : config.dot === "bg-amber-500"
        ? "#f59e0b"
        : "#f43f5e";
  return <circle cx={cx} cy={cy} r={5} strokeWidth={0} fill={color} />;
};

export default function ClientHistory() {
  const { user, loading } = useAuth();
  const { language } = useI18n();
  const isClient = !!user && (user.role === "client" || user.role === "user");
  const intl = useIntl();
  const isMobile = useIsMobile();

  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "historical">("active");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [highPainOnly, setHighPainOnly] = useState(false);
  const [showMissedDays, setShowMissedDays] = useState(false);

  const allAssignments = trpc.clientApp.listAllMyAssignments.useQuery(
    undefined,
    {
      enabled: !loading && isClient,
    }
  );

  const feedbackEnriched = trpc.clientApp.listMyFeedbackEnriched.useQuery(
    {
      assignmentId:
        selectedAssignment !== "all" ? Number(selectedAssignment) : undefined,
      from: filterDateFrom
        ? filterDateFrom.toLocaleDateString("en-CA")
        : undefined,
      to: filterDateTo ? filterDateTo.toLocaleDateString("en-CA") : undefined,
    },
    { enabled: !loading && isClient }
  );

  const assignmentRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    return (allAssignments.data ?? []).filter(a => {
      if (
        selectedAssignment !== "all" &&
        a.assignment.id !== Number(selectedAssignment)
      )
        return false;

      if (viewMode === "active") {
        return (
          a.assignment.status === "active" && a.assignment.endDate >= todayStr
        );
      } else if (viewMode === "historical") {
        return (
          a.assignment.status === "completed" || a.assignment.endDate < todayStr
        );
      }
      return true;
    });
  }, [allAssignments.data, selectedAssignment, viewMode]);

  const activeStats = useMemo(() => {
    const list = (allAssignments.data ?? []).filter(
      a => a.assignment.status === "active"
    );
    return { total: list.length, list };
  }, [allAssignments.data]);

  const sortedData = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    let list = feedbackEnriched.data ?? [];
    if (viewMode === "active") {
      list = list.filter(
        f =>
          f.assignment.status === "active" && f.assignment.endDate >= todayStr
      );
    } else if (viewMode === "historical") {
      list = list.filter(
        f =>
          f.assignment.status === "completed" || f.assignment.endDate < todayStr
      );
    }
    return [...list]
      .sort(
        (a, b) =>
          new Date(a.feedback.submittedAt).getTime() -
          new Date(b.feedback.submittedAt).getTime()
      )
      .map(f => ({
        submittedAt: f.feedback.submittedAt,
        pain: f.feedback.painScore,
      }));
  }, [feedbackEnriched.data, viewMode]);

  const historyRecords = useMemo(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    let assignmentsList = allAssignments.data ?? [];
    const logsList = feedbackEnriched.data ?? [];

    if (selectedAssignment !== "all") {
      assignmentsList = assignmentsList.filter(
        a => a.assignment.id === Number(selectedAssignment)
      );
    }

    const missedLogs: {
      feedback: {
        id: string;
        painScore: number | null;
        notes: string;
        submittedAt: string;
        createdAt: Date;
        completed: boolean;
        isMissed: boolean;
      };
      exercise: {
        id: number;
        title: string;
      };
      assignment: {
        id: number;
        startDate: string;
        endDate: string;
        status: string;
      };
    }[] = [];

    if (showMissedDays) {
      assignmentsList.forEach(a => {
        const isCurrentActive =
          a.assignment.status === "active" && a.assignment.endDate >= todayStr;
        if (viewMode === "active" && !isCurrentActive) return;
        if (viewMode === "historical" && isCurrentActive) return;

        const start = new Date(a.assignment.startDate + "T00:00:00");
        const end = new Date(a.assignment.endDate + "T00:00:00");
        const today = new Date(todayStr + "T00:00:00");

        const current = new Date(start);
        while (current <= end) {
          if (current >= today) {
            break;
          }

          const currentDateStr = current.toLocaleDateString("en-CA");

          // Apply date filters if set
          let inRange = true;
          if (filterDateFrom) {
            const fromStr = filterDateFrom.toLocaleDateString("en-CA");
            if (currentDateStr < fromStr) inRange = false;
          }
          if (filterDateTo) {
            const toStr = filterDateTo.toLocaleDateString("en-CA");
            if (currentDateStr > toStr) inRange = false;
          }

          if (inRange) {
            const logExists = logsList.some(l => {
              const logDateStr = new Date(
                l.feedback.submittedAt
              ).toLocaleDateString("en-CA");
              return (
                l.assignment.id === a.assignment.id &&
                logDateStr === currentDateStr
              );
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
                  status: a.assignment.status,
                },
              });
            }
          }
          current.setDate(current.getDate() + 1);
        }
      });
    }

    let combined: any[] = showMissedDays
      ? missedLogs
      : (feedbackEnriched.data ?? []).map(f => ({
          feedback: {
            ...f.feedback,
            isMissed: false,
          },
          exercise: f.exercise,
          assignment: f.assignment,
        }));

    if (highPainOnly) {
      combined = combined.filter(
        f =>
          f.feedback.isMissed ||
          (f.feedback.painScore !== null && f.feedback.painScore >= 7)
      );
    }

    if (viewMode === "active") {
      combined = combined.filter(
        f =>
          f.assignment.status === "active" && f.assignment.endDate >= todayStr
      );
    } else if (viewMode === "historical") {
      combined = combined.filter(
        f =>
          f.assignment.status === "completed" || f.assignment.endDate < todayStr
      );
    }

    return [...combined].sort(
      (a, b) =>
        new Date(b.feedback.submittedAt).getTime() -
        new Date(a.feedback.submittedAt).getTime()
    );
  }, [
    feedbackEnriched.data,
    allAssignments.data,
    highPainOnly,
    showMissedDays,
    viewMode,
    selectedAssignment,
    filterDateFrom,
    filterDateTo,
  ]);

  if (!loading && !isClient)
    return (
      <div className="p-8 text-center font-medium">
        <FormattedMessage id="common.notAuthorised" />
      </div>
    );

  return (
    <AppShell>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto text-slate-500 hover:text-[#534AB7] hover:bg-indigo-50/50 transition-colors justify-start"
        >
          <Link href="/client/exercises">
            <ArrowLeft className="size-4 mr-1" />
            <FormattedMessage id="client.history.backToExercises" />
          </Link>
        </Button>
        {/* Segmented View Toggle Control */}
        <div className="flex justify-center sm:justify-start">
          <div className="inline-flex p-1 bg-slate-200/50 border border-slate-200/80 rounded-xl shadow-inner select-none gap-1">
            <button
              onClick={() => {
                setViewMode("active");
                setSelectedAssignment("all");
              }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                viewMode === "active"
                  ? "bg-white text-[#534AB7] shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/30"
              }`}
            >
              <FormattedMessage id="client.history.activeExercise" />
            </button>
            <button
              onClick={() => {
                setViewMode("historical");
                setSelectedAssignment("all");
              }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                viewMode === "historical"
                  ? "bg-white text-[#534AB7] shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/30"
              }`}
            >
              <FormattedMessage id="client.history.completedExercise" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Dashboard Filters */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader
            className="pb-3 border-b border-slate-100/80 flex flex-row items-center justify-between cursor-pointer select-none"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-slate-400" />
              <CardTitle className="text-sm font-medium text-slate-900">
                <FormattedMessage id="client.history.filters.dashboard" />
              </CardTitle>
              {(selectedAssignment !== "all" ||
                filterDateFrom ||
                filterDateTo) && (
                <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-none font-bold text-[10px] py-0.5 px-2">
                  <FormattedMessage id="status.active.staff" />
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-[#534AB7] hover:bg-slate-50 font-semibold text-xs rounded-lg h-8 px-2.5"
            >
              {showFilters
                ? intl.formatMessage({ id: "common.collapse" })
                : intl.formatMessage({ id: "common.expand" })}
            </Button>
          </CardHeader>

          {showFilters && (
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <ClipboardCopy className="size-3 text-slate-400" />
                    <span>
                      <FormattedMessage id="client.history.assignmentFilter" />
                    </span>
                  </Label>
                  <Select
                    value={selectedAssignment}
                    onValueChange={setSelectedAssignment}
                  >
                    <SelectTrigger className="h-9 bg-white border-slate-200 focus:ring-[#534AB7] rounded-lg text-xs font-normal">
                      <SelectValue
                        placeholder={intl.formatMessage({
                          id: "client.history.allAssignments",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 text-xs shadow-md rounded-lg">
                      <SelectItem value="all">
                        <FormattedMessage id="client.history.allAssignments" />
                      </SelectItem>
                      {(allAssignments.data ?? [])
                        .filter(a => {
                          const todayStr = new Date().toLocaleDateString(
                            "en-CA"
                          );
                          if (viewMode === "active") {
                            return (
                              a.assignment.status === "active" &&
                              a.assignment.endDate >= todayStr
                            );
                          } else {
                            return (
                              a.assignment.status === "completed" ||
                              a.assignment.endDate < todayStr
                            );
                          }
                        })
                        .map(a => (
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

                <div className="flex flex-col gap-1.5 w-full sm:w-44 shrink-0">
                  <Label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <CalendarDays className="size-3 text-slate-400" />
                    <span>
                      <FormattedMessage id="client.history.from" />
                    </span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full bg-white border-slate-200 justify-start text-left font-semibold text-xs rounded-lg px-3 hover:bg-slate-50 text-slate-700"
                      >
                        {filterDateFrom ? (
                          intl.formatDate(filterDateFrom, {
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-slate-400 font-normal">
                            <FormattedMessage id="client.history.pickDate" />
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-white border border-slate-200 shadow-md rounded-lg"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={filterDateFrom}
                        onSelect={setFilterDateFrom}
                        disabled={date =>
                          filterDateTo ? date > filterDateTo : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-1.5 w-full sm:w-44 shrink-0">
                  <Label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-1.5 font-sans">
                    <CalendarDays className="size-3 text-slate-400" />
                    <span>
                      <FormattedMessage id="client.history.to" />
                    </span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full bg-white border-slate-200 justify-start text-left font-semibold text-xs rounded-lg px-3 hover:bg-slate-50 text-slate-700"
                      >
                        {filterDateTo ? (
                          intl.formatDate(filterDateTo, {
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="text-slate-400 font-normal">
                            <FormattedMessage id="client.history.pickDate" />
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-white border border-[#E4E7EC] shadow-md rounded-lg"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={filterDateTo}
                        onSelect={setFilterDateTo}
                        disabled={date =>
                          filterDateFrom ? date < filterDateFrom : false
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAssignment("all");
                      setFilterDateFrom(undefined);
                      setFilterDateTo(undefined);
                      toast.success("Filters cleared");
                    }}
                    className="h-9 text-xs border-slate-200 rounded-lg font-medium px-4"
                  >
                    <FormattedMessage id="common.clear" />
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success("Filters applied");
                    }}
                    className="h-9 text-xs bg-[#534AB7] hover:bg-[#534AB7]/90 text-white rounded-lg font-medium px-4"
                  >
                    <FormattedMessage id="common.apply" />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Top Stats Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">
                <FormattedMessage id="physio.detail.activeExercises" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#101828] mb-2 tabular-nums">
                {activeStats.total}
              </div>
              <p className="text-[11px] text-[#667085] font-medium">
                {intl.formatMessage(
                  { id: "client.history.activeExercisesCount" },
                  { count: activeStats.total }
                )}
              </p>
              {historyRecords.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <span className="text-[9px] text-[#98A2B3] uppercase tracking-widest font-semibold block mb-0.5">
                    <FormattedMessage id="client.history.lastLogged" />
                  </span>
                  <span className="text-[11px] text-[#101828] font-semibold block truncate">
                    {historyRecords[0].exercise.title}
                  </span>
                  <span className="text-[10px] text-[#667085]">
                    {intl.formatDate(
                      new Date(historyRecords[0].feedback.submittedAt),
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-widest">
                <FormattedMessage id="client.history.latestPain" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedData.length > 0 ? (
                (() => {
                  const painValue = sortedData[sortedData.length - 1].pain;
                  const config = PAIN_SCORE_CLASSES[Math.round(painValue)] || {
                    bg: "bg-slate-50",
                    text: "text-slate-700",
                    border: "border-slate-200",
                    label: "Unknown",
                    dot: "bg-slate-400",
                  };
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-[#101828] tabular-nums">
                          {painValue}/10
                        </span>
                        <div
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                          />
                          <span>{getPainLabel(config.label, intl)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#667085] font-medium">
                        {intl.formatMessage(
                          { id: "client.history.reportedOn" },
                          {
                            date: intl.formatDate(
                              new Date(
                                sortedData[sortedData.length - 1].submittedAt
                              ),
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            ),
                          }
                        )}
                      </p>
                    </div>
                  );
                })()
              ) : (
                <div>
                  <div className="text-3xl font-bold text-[#E4E7EC] mb-2">
                    —
                  </div>
                  <p className="text-[11px] text-[#667085] font-medium">
                    <FormattedMessage id="client.history.noReports" />
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pain Score Chart */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-medium text-slate-900 font-sans">
                <FormattedMessage id="client.history.painScore" />
              </CardTitle>
              <p className="text-xs text-slate-400 font-normal">
                {sortedData.length > 0
                  ? `${intl.formatDate(new Date(sortedData[0].submittedAt), { month: "short", day: "numeric", year: "numeric" })} — ${intl.formatDate(new Date(sortedData[sortedData.length - 1].submittedAt), { month: "short", day: "numeric", year: "numeric" })}`
                  : intl.formatMessage({ id: "client.history.noDataRange" })}
              </p>
            </div>
            {sortedData.length > 0 && (
              <span className="text-xs font-medium text-[#534AB7] bg-[#EEEDFE] border border-[#534AB7]/15 rounded-full px-2.5 py-0.5">
                <FormattedMessage id="client.history.clinicalOverview" />
              </span>
            )}
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {sortedData.length > 0 &&
              (() => {
                const latestPain = sortedData[sortedData.length - 1].pain;
                const peakValue = Math.max(...sortedData.map(d => d.pain));
                const latestDate = new Date(
                  sortedData[sortedData.length - 1].submittedAt
                );
                const threeDaysAgo = new Date(
                  latestDate.getTime() - 3 * 24 * 60 * 60 * 1000
                );
                const last3DaysLogs = sortedData.filter(
                  d => new Date(d.submittedAt) >= threeDaysAgo
                );
                const threeDayAvg =
                  last3DaysLogs.length > 0
                    ? Math.round(
                        (last3DaysLogs.reduce((acc, d) => acc + d.pain, 0) /
                          last3DaysLogs.length) *
                          10
                      ) / 10
                    : 0;
                return (
                  <div className="flex flex-wrap gap-3 text-xs font-medium text-[#667085]">
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">
                        <FormattedMessage id="client.history.latestReading" />
                      </span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">
                        {latestPain}/10
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">
                        <FormattedMessage id="client.history.peakValue" />
                      </span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">
                        {peakValue}/10
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] border border-[#E4E7EC] rounded-lg px-3 py-1.5">
                      <span className="text-[#98A2B3] block text-[9px] uppercase tracking-widest font-semibold">
                        <FormattedMessage id="client.history.threeDayAverage" />
                      </span>
                      <span className="text-[#101828] text-sm font-semibold tabular-nums">
                        {threeDayAvg}/10
                      </span>
                    </div>
                  </div>
                );
              })()}

            <div className="h-80 md:h-[24rem] w-full flex flex-col justify-between">
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sortedData}
                    margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#f43f5e"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="30%"
                          stopColor="#f43f5e"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="30.1%"
                          stopColor="#f59e0b"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="60%"
                          stopColor="#f59e0b"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="60.1%"
                          stopColor="#10b981"
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="100%"
                          stopColor="#10b981"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="painStroke"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      hide={isMobile}
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
                        intl.formatDate(new Date(String(v)), {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
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
                      dot={
                        <CustomizedDot cx={0} cy={0} payload={{ pain: 0 }} />
                      }
                      activeDot={
                        <CustomizedActiveDot
                          cx={0}
                          cy={0}
                          payload={{ pain: 0 }}
                        />
                      }
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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

        {/* Assigned Exercises Section */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold text-[#101828]">
                <FormattedMessage id="client.history.assignedExercises" />
              </CardTitle>
              <Badge className="bg-[#F2F4F7] text-[#667085] hover:bg-[#F2F4F7] border-none font-semibold text-[10px] py-0.5 px-2">
                {intl.formatMessage(
                  { id: "client.history.assignedCount" },
                  { count: assignmentRecords.length }
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignmentRecords.map(a => {
                const todayStr = new Date().toLocaleDateString("en-CA");
                const start = new Date(a.assignment.startDate + "T00:00:00");
                const end = new Date(a.assignment.endDate + "T00:00:00");
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const total = differenceInDays(end, start) + 1;
                const elapsed = differenceInDays(today, start);
                const percent = Math.min(
                  100,
                  Math.max(0, Math.round((elapsed / total) * 100))
                );
                const isActive =
                  a.assignment.status === "active" &&
                  a.assignment.endDate >= todayStr;
                return (
                  <div
                    key={a.assignment.id}
                    className={`border border-slate-200/75 border-l-4 ${isActive ? "border-l-emerald-500" : "border-l-slate-300"} rounded-xl p-4 bg-white hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h4 className="font-medium text-slate-800 text-base tracking-tight">
                        {a.exercise.title}
                      </h4>
                      <Badge
                        className={
                          isActive
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 border font-medium text-[10px]"
                            : "bg-slate-50 text-slate-500 border-slate-200 border font-medium text-[10px]"
                        }
                      >
                        {isActive
                          ? intl.formatMessage({
                              id: "client.history.activeExercise",
                            })
                          : intl.formatMessage({
                              id: "client.history.completed",
                            })}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5 mb-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {a.assignment.reps !== null && a.assignment.reps !== undefined && (a.assignment.durationMin || a.assignment.durationSec) ? (
                            <FormattedMessage id="client.today.detail.setsRepsDuration" defaultMessage="Sets, Reps & Duration" />
                          ) : a.assignment.reps !== null && a.assignment.reps !== undefined ? (
                            <FormattedMessage id="client.today.detail.setsReps" />
                          ) : (
                            <FormattedMessage id="client.today.detail.setsDuration" defaultMessage="Sets & Duration" />
                          )}
                        </span>
                        <p className="font-medium text-slate-800 text-sm mt-0.5">
                          {formatPrescriptionShort(
                            a.assignment.sets,
                            a.assignment.reps,
                            a.assignment.durationMin,
                            a.assignment.durationSec,
                            { lang: language }
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          <FormattedMessage id="client.history.dailyTarget" />
                        </span>
                        <p className="font-medium text-slate-800 text-sm mt-0.5">
                          {intl.formatMessage(
                            { id: "client.history.dailyTargetValue" },
                            { dailyFrequency: a.assignment.dailyFrequency }
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          <FormattedMessage id="client.history.assigned" />
                        </span>
                        <p className="font-medium text-slate-800 text-sm mt-0.5">
                          {intl.formatDate(new Date(a.assignment.createdAt), {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          <FormattedMessage id="client.history.physiotherapist" />
                        </span>
                        <p className="font-medium text-slate-800 text-sm mt-0.5">
                          {a.physiotherapist?.name ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>
                          <FormattedMessage id="client.history.planDuration" />
                        </span>
                        <span>
                          {intl.formatMessage(
                            { id: "client.history.completePercent" },
                            { percent }
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 relative overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-medium text-slate-400">
                        <span>
                          {intl.formatDate(start, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>
                          {intl.formatDate(end, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Session History Table Section */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              <FormattedMessage id="client.history.sessionHistory" />
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {intl.formatMessage(
                { id: "client.history.sessionFeedbackDetailed" },
                { count: historyRecords.length }
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg flex flex-col md:flex-row items-center justify-end gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 font-bold tracking-tight whitespace-nowrap text-[11px]">
                    <FormattedMessage id="client.history.highPainFilter" />
                  </span>
                  <Switch
                    checked={highPainOnly}
                    onCheckedChange={setHighPainOnly}
                  />
                </div>
                <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                  <span className="text-slate-600 font-bold tracking-tight whitespace-nowrap text-[11px]">
                    <FormattedMessage id="client.history.showMissedDaysFilter" />
                  </span>
                  <Switch
                    checked={showMissedDays}
                    onCheckedChange={setShowMissedDays}
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-200/60">
                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                      <FormattedMessage id="client.history.table.exercisePlan" />
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                      <FormattedMessage id="client.history.table.loggedDate" />
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                      <FormattedMessage id="client.history.table.painScore" />
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                      <FormattedMessage id="client.history.table.completion" />
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider">
                      <FormattedMessage id="client.history.table.patientNotes" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRecords.map(f => {
                    const isMissed =
                      "isMissed" in f.feedback &&
                      (f.feedback as { isMissed: unknown }).isMissed === true;
                    if (isMissed) {
                      return (
                        <TableRow
                          key={f.feedback.id}
                          className="border-b border-slate-100 bg-rose-50/5 hover:bg-rose-50/10 transition-colors"
                        >
                          <TableCell className="font-semibold text-slate-800 text-sm">
                            {f.exercise.title}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs font-semibold font-mono">
                            {intl.formatDate(
                              new Date(f.feedback.submittedAt + "T00:00:00"),
                              {
                                month: "2-digit",
                                day: "2-digit",
                                year: "2-digit",
                              }
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400 font-semibold">
                            —
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200 border font-bold text-xs w-fit">
                              <FormattedMessage id="client.history.missed" />
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 italic font-normal min-w-[300px] whitespace-pre-wrap">
                            <FormattedMessage id="client.history.noLog" />
                          </TableCell>
                        </TableRow>
                      );
                    }
                    const painConfig = PAIN_SCORE_CLASSES[
                      Math.round(f.feedback.painScore ?? 0)
                    ] || {
                      bg: "bg-slate-50",
                      text: "text-slate-700",
                      border: "border-slate-200",
                      dot: "bg-slate-400",
                    };
                    return (
                      <TableRow
                        key={f.feedback.id}
                        className="border-b border-slate-100 hover:bg-slate-50/40 transition-colors"
                      >
                        <TableCell className="font-semibold text-slate-800 text-sm">
                          {f.exercise.title}
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs font-semibold font-mono">
                          {intl.formatDate(new Date(f.feedback.submittedAt), {
                            month: "2-digit",
                            day: "2-digit",
                            year: "2-digit",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${painConfig.bg} ${painConfig.text} ${painConfig.border}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${painConfig.dot}`}
                            />
                            <span>{f.feedback.painScore}/10</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {f.feedback.completed ? (
                            <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border-emerald-200 border font-bold text-xs flex items-center gap-1 w-fit">
                              <Check className="size-3" />
                              <span>
                                <FormattedMessage id="client.history.completed" />
                              </span>
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-50 text-slate-500 border-slate-200 border font-bold text-xs w-fit">
                              <FormattedMessage id="client.history.missed" />
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm font-medium min-w-[300px] whitespace-pre-wrap">
                          {f.feedback.notes ?? (
                            <span className="text-slate-300 font-normal">
                              <FormattedMessage id="client.history.noNotes" />
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
