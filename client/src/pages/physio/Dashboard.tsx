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
import { Plus, Stethoscope, Trash2 } from "lucide-react";
import { MonitoringOverview } from "./MonitoringOverview";

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
          <TabsTrigger value="monitoring"><FormattedMessage id="physio.tab.monitoring" /></TabsTrigger>
        </TabsList>

        <TabsContent value="clients"><ClientsTab /></TabsContent>
        <TabsContent value="exercises"><ExercisesTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="monitoring"><MonitoringOverview /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

/* ---------- Clients tab ---------- */

function ClientsTab() {
  const clients = trpc.physio.listMyClients.useQuery();
  const activeClients = useMemo(
    () => (clients.data ?? []).filter((client) => client.status === "active"),
    [clients.data],
  );
  const inactiveClients = useMemo(
    () => (clients.data ?? []).filter((client) => client.status !== "active"),
    [clients.data],
  );

  return (
    <Card>
      <CardContent className="pt-6">
        {clients.isLoading && <div className="text-muted-foreground"><FormattedMessage id="common.loading" /></div>}
        {!clients.isLoading && (clients.data?.length ?? 0) === 0 && (
          <div className="text-muted-foreground"><FormattedMessage id="physio.clients.empty" /></div>
        )}
        {!clients.isLoading && (clients.data?.length ?? 0) > 0 && (
          <div className="space-y-6">
            <ClientGroup
              titleId="physio.clients.activeSection"
              emptyId="physio.clients.activeEmpty"
              clients={activeClients}
            />
            <ClientGroup
              titleId="physio.clients.inactiveSection"
              emptyId="physio.clients.inactiveEmpty"
              clients={inactiveClients}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientGroup({
  titleId,
  emptyId,
  clients,
}: {
  titleId: string;
  emptyId: string;
  clients: Array<{ id: number; name: string | null; email: string | null; status: string }>;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <FormattedMessage id={titleId} />
        </h3>
        <span className="text-xs text-muted-foreground">{clients.length}</span>
      </div>
      {clients.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id={emptyId} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </section>
  );
}

function ClientCard({ client }: { client: { id: number; name: string | null; email: string | null; status: string } }) {
  const stats = trpc.physio.getClientStats.useQuery({ clientId: client.id });
  const rate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;
  const badgeVariant = client.status === "active" ? "default" : "destructive";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{client.name ?? client.email ?? `#${client.id}`}</CardTitle>
          <Badge variant={badgeVariant}>
            <FormattedMessage id={`status.${client.status}`} />
          </Badge>
        </div>
        <CardDescription className="truncate">{client.email ?? ""}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id="physio.clients.completion" />: <span className="font-medium text-foreground">{rate}%</span>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-3 w-full">
          <Link href={`/physio/clients/${client.id}`}>
            <FormattedMessage id="physio.clients.viewDetails" />
          </Link>
        </Button>
      </CardContent>
    </Card>
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
                  {e.defaultReps} reps · {e.defaultSets ?? 1} sets default · <a href={e.videoUrl} target="_blank" rel="noreferrer" className="underline">video</a>
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
            <Label><FormattedMessage id="physio.exercise.defaultReps" /></Label>
            <Input
              type="number"
              min={1}
              max={500}
              value={defaultReps}
              onChange={(e) => setDefaultReps(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Default sets</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={defaultSets}
              onChange={(e) => setDefaultSets(Number(e.target.value))}
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
  const [reps, setReps] = useState(10);

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
            <DialogContent>
              <DialogHeader><DialogTitle><FormattedMessage id="physio.assign.title" /></DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label><FormattedMessage id="physio.assign.client" /></Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name ?? c.email ?? `#${c.id}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label><FormattedMessage id="physio.assign.exercise" /></Label>
                  <Select value={exerciseId} onValueChange={setExerciseId}>
                    <SelectTrigger><SelectValue placeholder="Select exercise" /></SelectTrigger>
                    <SelectContent>
                      {exercises.data?.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label><FormattedMessage id="physio.assign.reps" /></Label>
                    <Input type="number" min={1} max={500} value={reps} onChange={(e) => setReps(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label><FormattedMessage id="physio.assign.startDate" /></Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label><FormattedMessage id="physio.assign.endDate" /></Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                      reps,
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
              <TableHead>Reps</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6"><FormattedMessage id="common.loading" /></TableCell></TableRow>
            )}
            {assignments.data?.map((row) => (
              <TableRow key={row.assignment.id}>
                <TableCell>{row.client.name ?? row.client.email ?? `#${row.client.id}`}</TableCell>
                <TableCell>{row.exercise.title}</TableCell>
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
