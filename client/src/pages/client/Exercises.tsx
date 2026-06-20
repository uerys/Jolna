import { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CalendarDays,
  History,
  User,
  Stethoscope,
  Activity,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MoreVertical,
  Calendar as CalendarIcon,
  Dumbbell,
  MessageSquare,
} from "lucide-react";

/** Format injury type enum to human-readable label */
function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Format exercise type enum to human-readable label */
function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Format clinic visit string */
function formatClinicVisit(visitStr: string | null | undefined, intl: any): string {
  if (!visitStr) {
    return intl.formatMessage({ id: "client.today.nextClinicVisit.notScheduled", defaultMessage: "Not scheduled" });
  }
  try {
    const d = new Date(visitStr);
    const locale = intl.locale === "kh" ? "km-KH" : intl.locale;
    if (isNaN(d.getTime())) {
      const fallbackDate = new Date(visitStr + "T00:00:00");
      if (isNaN(fallbackDate.getTime())) return visitStr;
      return fallbackDate.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });
    }
    const datePart = d.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
    const timePart = d
      .toLocaleTimeString(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
    return intl.formatMessage(
      { id: "client.today.nextClinicVisit.format", defaultMessage: "{datePart} at {timePart}" },
      { datePart, timePart }
    );
  } catch {
    return visitStr;
  }
}

/** Format date string to short display */
function formatDateShort(dateStr: string, intl: any): string {
  const d = new Date(dateStr + "T00:00:00");
  const locale = intl.locale === "kh" ? "km-KH" : intl.locale;
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function ClientExercises() {
  const { user, loading } = useAuth();
  const { language } = useI18n();
  const [, navigate] = useLocation();
  const intl = useIntl();

  const isClient = !!user && (user.role === "client" || user.role === "user");

  // TIMEZONE FIX: 1. Get the patient's exact local date in YYYY-MM-DD
  const localToday = new Date().toLocaleDateString("en-CA");

  // TIMEZONE FIX: 2. Pass it forcefully into the backend queries
  const today = trpc.clientApp.listTodayAssignments.useQuery(
    { clientDate: localToday },
    { enabled: !loading && isClient }
  );

  const rehabSummary = trpc.clientApp.getRehabSummary.useQuery(
    { clientDate: localToday },
    { enabled: !loading && isClient }
  );

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "admin") {
      navigate("/admin/users", { replace: true });
    } else if (user.role === "physiotherapist") {
      navigate("/physio", { replace: true });
    }
  }, [loading, user, navigate]);

  if (!loading && user && !isClient) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>
              <FormattedMessage id="common.notAuthorised" />
            </CardTitle>
            <CardDescription>
              <FormattedMessage id="client.today.onlyClient" />
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Rehabilitation Summary Header (Redesigned) */}
      {rehabSummary.data && (
        <Card className="mb-6 border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-slate-200 shadow-sm flex items-center justify-center bg-indigo-50 text-indigo-700 rounded-full">
                  <AvatarImage src={user?.avatarUrl ?? undefined} alt={rehabSummary.data.clientName} />
                  <AvatarFallback className="text-xl font-bold bg-indigo-50 text-indigo-700">
                    {rehabSummary.data.clientName
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold text-[#101828] tracking-tight">
                      {rehabSummary.data.clientName}
                    </h1>
                    <Badge className={
                      user?.status === "active"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold shadow-sm"
                        : user?.status === "inactive"
                        ? "bg-amber-50 text-amber-800 border-amber-200 font-semibold shadow-sm"
                        : "bg-red-50 text-red-800 border-red-200 font-semibold shadow-sm"
                    }>
                      {user?.status === "active"
                        ? intl.formatMessage({ id: "status.active" })
                        : user?.status === "inactive"
                        ? intl.formatMessage({ id: "status.inactive" })
                        : user?.status === "suspended"
                        ? intl.formatMessage({ id: "status.suspended" })
                        : "—"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#98A2B3] font-medium">
                    {intl.formatMessage({ id: "physio.detail.patientId" }, { id: user?.id })}
                  </p>
                </div>
              </div>
            </div>

            {/* Patient Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                  <Mail className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">
                    {intl.formatMessage({ id: "physio.detail.emailAddress" })}
                  </p>
                  <p className="font-semibold text-[#101828] truncate text-sm">
                    {user?.email ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                  <Phone className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">
                    {intl.formatMessage({ id: "physio.detail.phoneNumber" })}
                  </p>
                  <p className="font-semibold text-[#101828] truncate text-sm">
                    {user?.phoneNumber ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                  <Activity className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">
                    {intl.formatMessage({ id: "physio.detail.primaryDiagnosis" })}
                  </p>
                  <p className="font-semibold text-[#101828] truncate text-sm">
                    {formatInjuryType(rehabSummary.data.injuryType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                  <CalendarIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">
                    {intl.formatMessage({ id: "physio.detail.nextClinicVisit" })}
                  </p>
                  <p className="font-semibold text-[#101828] truncate text-sm">
                    {formatClinicVisit(rehabSummary.data.nextClinicVisit, intl)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                  <Dumbbell className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#98A2B3] font-semibold uppercase tracking-widest">
                    {intl.formatMessage({ id: "physio.detail.activeExercises" })}
                  </p>
                  <p className="font-semibold text-[#101828] truncate text-sm">
                    {rehabSummary.data.activeAssignmentCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              <FormattedMessage id="client.today.title" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <FormattedMessage id="client.today.subtitle" />
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white font-bold transition-all"
          >
            <Link href="/chat">
              <MessageSquare className="size-4 mr-1.5" />
              <FormattedMessage id="client.today.chatWithPhysio" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white font-bold transition-all"
          >
            <Link href="/client/history">
              <History className="size-4 mr-1" />
              <FormattedMessage id="client.today.historyProgress" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Exercise Cards */}
      <div className="mt-6 space-y-4">
        {today.isLoading && (
          <div className="text-muted-foreground">
            <FormattedMessage id="common.loading" />
          </div>
        )}
        {!today.isLoading && (today.data?.length ?? 0) === 0 && (
          <Card>
            <CardContent className="pt-6 text-muted-foreground">
              <FormattedMessage id="client.today.noAssignments" />
            </CardContent>
          </Card>
        )}
        {today.data?.map(row => (
          <ExerciseCard
            key={row.assignment.id}
            language={language}
            assignment={row.assignment}
            exercise={row.exercise}
            physiotherapist={row.physiotherapist}
            todayLogCount={row.todayLogCount}
          />
        ))}
      </div>

    </AppShell>
  );
}

/** Duration bar visualization */
function DurationBar({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const intl = useIntl();
  // TIMEZONE FIX: Use local date string instead of UTC toISOString()
  const today = new Date().toLocaleDateString("en-CA");
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  const totalDays = Math.max(
    1,
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  const elapsed = Math.max(
    0,
    Math.min(
      totalDays,
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const progress = Math.round((elapsed / totalDays) * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatDateShort(startDate, intl)}</span>
        <span>{formatDateShort(endDate, intl)}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-emerald-600 font-medium">
        <FormattedMessage id="client.today.activePeriod" />
      </p>
    </div>
  );
}

function ExerciseCard({
  assignment,
  exercise,
  physiotherapist,
  language,
  todayLogCount,
}: {
  assignment: {
    id: number;
    reps: number;
    sets: number;
    dailyFrequency: number;
    startDate: string;
    endDate: string;
    status: string;
    injuryType: string;
    exerciseType: string;
    physiotherapistId: number;
    createdAt: string | Date;
  };
  exercise: {
    id: number;
    title: string;
    instructionsEn: string;
    instructionsKh: string;
    videoUrl: string;
    exerciseType: string;
  };
  physiotherapist: { name: string | null; email: string | null };
  language: "en" | "kh";
  todayLogCount?: number;
}) {
  const intl = useIntl();
  const { dailyFrequency } = assignment;
  const progressPercent = Math.min(
    100,
    Math.round(((todayLogCount ?? 0) / dailyFrequency) * 100)
  );
  const isDoneToday = (todayLogCount ?? 0) >= dailyFrequency;

  const instructions =
    language === "kh" ? exercise.instructionsKh : exercise.instructionsEn;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { embedSrc, watchUrl, thumbnail } = useMemo(() => {
    if (!exercise.videoUrl)
      return { embedSrc: null, watchUrl: null, thumbnail: null };
    try {
      const u = new URL(exercise.videoUrl);
      if (
        u.hostname.includes("youtube.com") &&
        u.pathname.startsWith("/embed/")
      ) {
        const id = u.pathname.split("/embed/")[1];
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
        const id = u.searchParams.get("v")!;
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      if (u.hostname === "youtu.be") {
        const id = u.pathname.replace(/^\//, "");
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      return { embedSrc: null, watchUrl: exercise.videoUrl, thumbnail: null };
    } catch (e) {
      return { embedSrc: null, watchUrl: exercise.videoUrl, thumbnail: null };
    }
  }, [exercise.videoUrl]);

  const statusColor =
    assignment.status === "active"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : assignment.status === "completed"
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : "bg-gray-100 text-gray-800";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg leading-tight">{exercise.title}</CardTitle>
              <p className="text-sm font-medium text-muted-foreground mt-1.5">
                {intl.formatMessage(
                  { id: "client.today.prescription" },
                  { sets: assignment.sets, reps: assignment.reps, dailyFrequency: assignment.dailyFrequency }
                )}
              </p>
            </div>
            <Badge className={statusColor}>
              {assignment.status === "active"
                ? intl.formatMessage({ id: "client.today.activeExercise" })
                : assignment.status === "completed"
                ? intl.formatMessage({ id: "client.history.completed" })
                : assignment.status}
            </Badge>
          </div>

          {/* Daily Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-700">
                <FormattedMessage id="client.today.progress" />
              </span>
              <span
                className={
                  isDoneToday
                    ? "text-emerald-600 font-bold"
                    : "text-slate-600 font-medium"
                }
              >
                {intl.formatMessage(
                  { id: "client.today.sessions" },
                  { current: Math.min(todayLogCount ?? 0, dailyFrequency), total: dailyFrequency }
                )}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`${isDoneToday ? "bg-emerald-500" : "bg-[#534AB7]"} h-2 rounded-full transition-all`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Video Container */}
        <div className="aspect-video rounded-lg overflow-hidden bg-muted ring-1 ring-border/50 flex items-center justify-center">
          {thumbnail ? (
            <a
              href={watchUrl ?? exercise.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full h-full relative"
            >
              <img
                src={thumbnail}
                alt={`Video thumbnail for ${exercise.title}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-white/90 p-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="#ff0000"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <p className="mb-2 text-sm text-muted-foreground">
                Video will open in a new tab.
              </p>
              <a
                href={watchUrl ?? exercise.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open video
              </a>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-muted/40 rounded-lg p-3 sm:p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {instructions}
          </p>
        </div>

        {/* Expandable assignment details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {expanded ? (
            <FormattedMessage id="client.today.hideDetails" />
          ) : (
            <FormattedMessage id="client.today.viewDetails" />
          )}
        </button>
        {expanded && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-4 text-sm mt-4">
            <DurationBar startDate={assignment.startDate} endDate={assignment.endDate} />
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-2 border-t border-slate-200/60">
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.physio" />
                </span>
                <p className="font-medium">
                  {physiotherapist.name ?? physiotherapist.email ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.injuryType" />
                </span>
                <p className="font-medium">
                  {formatInjuryType(assignment.injuryType)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.exerciseType" />
                </span>
                <p className="font-medium">
                  {formatExerciseType(assignment.exerciseType)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.setsReps" />
                </span>
                <p className="font-medium">
                  {assignment.sets} × {assignment.reps} (
                  {intl.formatMessage(
                    { id: "client.today.detail.dailyTarget" },
                    { dailyFrequency: assignment.dailyFrequency }
                  )})
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.startDate" />
                </span>
                <p className="font-medium">
                  {formatDateShort(assignment.startDate, intl)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.endDate" />
                </span>
                <p className="font-medium">
                  {formatDateShort(assignment.endDate, intl)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.status" />
                </span>
                <p className="font-medium">
                  {assignment.status === "active"
                    ? intl.formatMessage({ id: "client.today.activeExercise" })
                    : assignment.status === "completed"
                    ? intl.formatMessage({ id: "client.history.completed" })
                    : assignment.status}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">
                  <FormattedMessage id="client.today.detail.assignedDate" />
                </span>
                <p className="font-medium">
                  {new Date(assignment.createdAt).toLocaleDateString(
                    intl.locale === "kh" ? "km-KH" : intl.locale
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isDoneToday ? (
          <div className="space-y-2">
            <Button
              disabled
              className="w-full h-10 sm:h-9 text-base sm:text-sm font-bold shadow-sm bg-emerald-600 opacity-100 cursor-default"
            >
              <FormattedMessage id="client.today.targetReached" />
            </Button>
            <Button
              onClick={() => {
                if (confirm(intl.formatMessage({ id: "client.today.redoConfirm" }))) {
                  setOpen(true);
                }
              }}
              variant="outline"
              className="w-full h-10 sm:h-9 text-base sm:text-sm font-bold border-[#534AB7] text-[#534AB7] hover:bg-[#EEEDFE] hover:text-[#534AB7] shadow-sm transition-all"
            >
              <FormattedMessage id="client.today.resubmitProgress" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setOpen(true)}
            className="w-full h-10 sm:h-9 text-base sm:text-sm font-bold shadow-sm bg-[#534AB7] hover:bg-[#534AB7]/90 focus-visible:ring-[#534AB7] transition-all"
          >
            <FormattedMessage id="client.today.logFeedback" />
          </Button>
        )}
      </CardContent>
      <FeedbackDialog
        assignmentId={assignment.id}
        open={open}
        onClose={() => setOpen(false)}
        dailyFrequency={dailyFrequency}
        todayLogCount={todayLogCount}
      />
    </Card>
  );
}

function FeedbackDialog({
  assignmentId,
  open,
  onClose,
  dailyFrequency,
  todayLogCount = 0,
}: {
  assignmentId: number;
  open: boolean;
  onClose: () => void;
  dailyFrequency: number;
  todayLogCount?: number;
}) {
  const intl = useIntl();
  const utils = trpc.useUtils();
  const submit = trpc.clientApp.submitFeedback.useMutation({
    onSuccess: async () => {
      await utils.clientApp.listMyFeedback.invalidate();
      await utils.clientApp.listMyFeedbackEnriched.invalidate();
      await utils.clientApp.listTodayAssignments.invalidate();
      await utils.clientApp.getRehabSummary.invalidate();
      toast.success(intl.formatMessage({ id: "client.feedback.submitted" }));
      onClose();
    },
  });

  const [painScore, setPainScore] = useState<number>(3);
  const [completed, setCompleted] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPainScore(3);
      setCompleted(false);
      setNotes("");
    }
  }, [open]);

  const painColor = useMemo(() => {
    if (painScore >= 7) return "text-destructive";
    if (painScore >= 4) return "text-amber-600";
    return "text-emerald-600";
  }, [painScore]);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            <FormattedMessage id="client.today.logFeedback" />
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Logging session {Math.min(dailyFrequency, todayLogCount + 1)} of{" "}
            {dailyFrequency} for today
          </p>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                <FormattedMessage id="client.feedback.painScore" />
              </Label>
              <span className={`text-2xl font-bold ${painColor}`}>
                {painScore}
              </span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[painScore]}
              onValueChange={v => setPainScore(v[0] ?? 0)}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <FormattedMessage id="client.feedback.painHint" />
            </p>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/40">
            <Label className="cursor-pointer text-sm">
              <FormattedMessage id="client.feedback.completed" />
            </Label>
            <Switch checked={completed} onCheckedChange={setCompleted} />
          </div>

          <div className="space-y-2">
            <Label className="text-base">
              <FormattedMessage id="client.feedback.notes" />
            </Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes..."
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            <FormattedMessage id="common.cancel" />
          </Button>
          <Button
            onClick={() =>
              submit.mutate({
                assignmentId,
                painScore,
                completed,
                notes: notes || undefined,
              })
            }
            className="w-full sm:w-auto bg-[#534AB7] hover:bg-[#534AB7]/90 font-bold shadow-sm focus-visible:ring-[#534AB7]"
            disabled={submit.isPending || !completed}
          >
            {submit.isPending ? (
              "..."
            ) : (
              <FormattedMessage id="client.feedback.submit" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
