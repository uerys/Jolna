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
} from "lucide-react";

/** Format injury type enum to human-readable label */
function formatInjuryType(type: string | null | undefined): string {
  if (!type) return "—";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Format exercise type enum to human-readable label */
function formatExerciseType(type: string | null | undefined): string {
  if (!type) return "—";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Format date string to short display */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ClientExercises() {
  const { user, loading } = useAuth();
  const { language } = useI18n();
  const [, navigate] = useLocation();

  const isClient = !!user && (user.role === "client" || user.role === "user");

  const today = trpc.clientApp.listTodayAssignments.useQuery(undefined, {
    enabled: !loading && isClient,
  });

  const rehabSummary = trpc.clientApp.getRehabSummary.useQuery(undefined, {
    enabled: !loading && isClient,
  });

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
            <CardTitle><FormattedMessage id="common.notAuthorised" /></CardTitle>
            <CardDescription><FormattedMessage id="client.today.onlyClient" /></CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Rehabilitation Summary */}
      {rehabSummary.data && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <CardTitle className="text-lg">Rehabilitation Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium">{rehabSummary.data.clientName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stethoscope className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Physiotherapist</p>
                  <p className="text-sm font-medium">
                    {rehabSummary.data.physiotherapistName ?? "Not assigned"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Injury Type</p>
                  <p className="text-sm font-medium">
                    {formatInjuryType(rehabSummary.data.injuryType)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Clinic Visit</p>
                  <p className="text-sm font-medium">
                    {rehabSummary.data.nextClinicVisit
                      ? formatDateShort(rehabSummary.data.nextClinicVisit)
                      : "Not scheduled"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Assignments</p>
                  <p className="text-sm font-medium">{rehabSummary.data.activeAssignmentCount}</p>
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
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/client/history">
            <History className="size-4 mr-1" />
            History & Progress
          </Link>
        </Button>
      </div>

      {/* Exercise Cards */}
      <div className="mt-6 space-y-4">
        {today.isLoading && <div className="text-muted-foreground"><FormattedMessage id="common.loading" /></div>}
        {!today.isLoading && (today.data?.length ?? 0) === 0 && (
          <Card><CardContent className="pt-6 text-muted-foreground"><FormattedMessage id="client.today.noAssignments" /></CardContent></Card>
        )}
        {today.data?.map((row) => (
          <ExerciseCard
            key={row.assignment.id}
            language={language}
            assignment={row.assignment}
            exercise={row.exercise}
            physiotherapist={row.physiotherapist}
          />
        ))}
      </div>

      {/* Data Transparency Notice */}
      <Card className="mt-8 border-muted">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Data Transparency:</strong> Your pain scores, completion status, and notes can be viewed by your assigned physiotherapist for rehabilitation monitoring. Your phone number may be visible to authorized clinic staff for contact purposes. Telegram is used only as an external contact link — messages are not stored inside JOLNA.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}

/** Duration bar visualization */
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
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-emerald-600 font-medium">Active period</p>
    </div>
  );
}

function ExerciseCard({
  assignment,
  exercise,
  physiotherapist,
  language,
}: {
  assignment: {
    id: number;
    reps: number;
    sets: number;
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
}) {
  const instructions = language === "kh" ? exercise.instructionsKh : exercise.instructionsEn;
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { embedSrc, watchUrl, thumbnail } = useMemo(() => {
    if (!exercise.videoUrl) return { embedSrc: null, watchUrl: null, thumbnail: null };
    try {
      const u = new URL(exercise.videoUrl);
      if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
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
      if (exercise.videoUrl.includes("embed")) {
        return { embedSrc: exercise.videoUrl, watchUrl: exercise.videoUrl, thumbnail: null };
      }
    } catch (e) {
      const m = exercise.videoUrl.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
      if (m && m[1]) {
        const id = m[1];
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
    }
    return { embedSrc: null, watchUrl: exercise.videoUrl, thumbnail: null };
  }, [exercise.videoUrl]);

  const statusColor = assignment.status === "active"
    ? "bg-emerald-100 text-emerald-800"
    : assignment.status === "completed"
    ? "bg-blue-100 text-blue-800"
    : "bg-gray-100 text-gray-800";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3 sm:pb-4">
        {/* Compact card header with transparency info */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg leading-tight pr-2">{exercise.title}</CardTitle>
            <Badge className={statusColor}>{assignment.status}</Badge>
          </div>
          {/* Compact info line: Injury • Exercise Type • Status */}
          <p className="text-sm text-muted-foreground">
            {formatInjuryType(assignment.injuryType)} • {formatExerciseType(assignment.exerciseType)}
          </p>
          {/* Sets and reps */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {assignment.sets} sets × {assignment.reps} reps
            </Badge>
          </div>
          {/* Duration bar */}
          <DurationBar startDate={assignment.startDate} endDate={assignment.endDate} />
          {/* Assigned by */}
          <p className="text-xs text-muted-foreground">
            Assigned by PT. {physiotherapist.name ?? physiotherapist.email ?? "Unknown"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Video Container */}
        <div className="aspect-video rounded-lg overflow-hidden bg-muted ring-1 ring-border/50 flex items-center justify-center">
          {thumbnail ? (
            <a href={watchUrl ?? exercise.videoUrl} target="_blank" rel="noreferrer" className="block w-full h-full relative">
              <img src={thumbnail} alt={`Video thumbnail for ${exercise.title}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-white/90 p-3 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff0000">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6">
              <p className="mb-2 text-sm text-muted-foreground">Video will open in a new tab.</p>
              <a href={watchUrl ?? exercise.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open video</a>
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
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? "Hide assignment details" : "View assignment details"}
        </button>
        {expanded && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground text-xs">Assigned Physiotherapist</span>
                <p className="font-medium">{physiotherapist.name ?? physiotherapist.email ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Injury Type</span>
                <p className="font-medium">{formatInjuryType(assignment.injuryType)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Exercise Type</span>
                <p className="font-medium">{formatExerciseType(assignment.exerciseType)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Sets & Reps</span>
                <p className="font-medium">{assignment.sets} × {assignment.reps}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Start Date</span>
                <p className="font-medium">{formatDateShort(assignment.startDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">End Date</span>
                <p className="font-medium">{formatDateShort(assignment.endDate)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Status</span>
                <p className="font-medium capitalize">{assignment.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Assigned Date</span>
                <p className="font-medium">{new Date(assignment.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={() => setOpen(true)}
          className="w-full h-10 sm:h-9 text-base sm:text-sm"
        >
          <FormattedMessage id="client.today.logFeedback" />
        </Button>
      </CardContent>
      <FeedbackDialog
        assignmentId={assignment.id}
        open={open}
        onClose={() => setOpen(false)}
      />
    </Card>
  );
}

function FeedbackDialog({ assignmentId, open, onClose }: { assignmentId: number; open: boolean; onClose: () => void }) {
  const intl = useIntl();
  const utils = trpc.useUtils();
  const submit = trpc.clientApp.submitFeedback.useMutation({
    onSuccess: async () => {
      await utils.clientApp.listMyFeedback.invalidate();
      await utils.clientApp.listMyFeedbackEnriched.invalidate();
      toast.success(intl.formatMessage({ id: "client.feedback.submitted" }));
      onClose();
    },
  });

  const [painScore, setPainScore] = useState<number>(3);
  const [completed, setCompleted] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  const painColor = useMemo(() => {
    if (painScore >= 7) return "text-destructive";
    if (painScore >= 4) return "text-amber-600";
    return "text-emerald-600";
  }, [painScore]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full max-w-sm sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl"><FormattedMessage id="client.today.logFeedback" /></DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base"><FormattedMessage id="client.feedback.painScore" /></Label>
              <span className={`text-2xl font-bold ${painColor}`}>{painScore}</span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[painScore]}
              onValueChange={(v) => setPainScore(v[0] ?? 0)}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <FormattedMessage id="client.feedback.painHint" />
            </p>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/40">
            <Label className="cursor-pointer text-sm"><FormattedMessage id="client.feedback.completed" /></Label>
            <Switch checked={completed} onCheckedChange={setCompleted} />
          </div>

          <div className="space-y-2">
            <Label className="text-base"><FormattedMessage id="client.feedback.notes" /></Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
            className="w-full sm:w-auto"
            disabled={submit.isPending}
          >
            {submit.isPending ? "..." : <FormattedMessage id="client.feedback.submit" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
