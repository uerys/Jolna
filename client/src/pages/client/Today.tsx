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
import { CalendarDays, History } from "lucide-react";

export default function ClientToday() {
  const { user, loading } = useAuth();
  const { language } = useI18n();
  const [, navigate] = useLocation();

  const isClient = !!user && (user.role === "client" || user.role === "user");

  // Only run the protected query when the caller really is a client —
  // otherwise tRPC returns FORBIDDEN and toasts a scary error.
  const today = trpc.clientApp.listTodayAssignments.useQuery(undefined, {
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
            History
          </Link>
        </Button>
      </div>

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
          />
        ))}
      </div>
    </AppShell>
  );
}

function ExerciseCard({
  assignment,
  exercise,
  language,
}: {
  assignment: { id: number; reps: number };
  exercise: { id: number; title: string; instructionsEn: string; instructionsKh: string; videoUrl: string };
  language: "en" | "kh";
}) {
  const instructions = language === "kh" ? exercise.instructionsKh : exercise.instructionsEn;
  const [open, setOpen] = useState(false);
  const { embedSrc, watchUrl, thumbnail } = useMemo(() => {
    if (!exercise.videoUrl) return { embedSrc: null, watchUrl: null, thumbnail: null };
    try {
      const u = new URL(exercise.videoUrl);
      // youtube embed path
      if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/embed/")[1];
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      // watch?v= style -> extract id
      if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
        const id = u.searchParams.get("v")!;
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      // youtu.be short link
      if (u.hostname === "youtu.be") {
        const id = u.pathname.replace(/^\//, "");
        return {
          embedSrc: `https://www.youtube.com/embed/${id}`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        };
      }
      // fallback: if contains embed or video provider, return embed as-is
      if (exercise.videoUrl.includes("embed")) {
        return { embedSrc: exercise.videoUrl, watchUrl: exercise.videoUrl, thumbnail: null };
      }
    } catch (e) {
      // fallback regex for youtube id
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

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg leading-tight pr-2">{exercise.title}</CardTitle>
          <Badge variant="secondary" className="w-fit">
            <FormattedMessage id="client.today.reps" values={{ reps: assignment.reps }} />
          </Badge>
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
          {/* Pain Score Section */}
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

          {/* Completion Toggle */}
          <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/40">
            <Label className="cursor-pointer text-sm"><FormattedMessage id="client.feedback.completed" /></Label>
            <Switch checked={completed} onCheckedChange={setCompleted} />
          </div>

          {/* Notes Section */}
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
