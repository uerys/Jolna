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
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";

export default function PhysioClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const { user, loading } = useAuth();

  const client = trpc.admin.getUser.useQuery(
    { id: clientId },
    { enabled: !!clientId },
  );
  const feedback = trpc.physio.listClientFeedback.useQuery(
    { clientId },
    { enabled: !!clientId },
  );
  const stats = trpc.physio.getClientStats.useQuery(
    { clientId },
    { enabled: !!clientId },
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

  const chart = (feedback.data ?? [])
    .slice()
    .reverse()
    .map((f) => ({
      date: new Date(f.submittedAt).toLocaleDateString(),
      pain: f.painScore,
    }));
  const rate = stats.data?.total
    ? Math.round((stats.data.completed / stats.data.total) * 100)
    : 0;

  return (
    <AppShell>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link href="/physio">
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-tight">
        {client.data?.name ?? client.data?.email ?? `#${clientId}`}
      </h1>
      <p className="text-sm text-muted-foreground">{client.data?.email}</p>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="physio.monitor.painTrend" /></CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            {chart.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                <FormattedMessage id="physio.monitor.noData" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="currentColor" fontSize={12} />
                  <YAxis domain={[0, 10]} stroke="currentColor" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pain" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="physio.monitor.completion" /></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{rate}%</div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.data?.completed ?? 0} / {stats.data?.total ?? 0} sessions completed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle><FormattedMessage id="physio.monitor.history" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pain</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(feedback.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    <FormattedMessage id="physio.monitor.noData" />
                  </TableCell>
                </TableRow>
              )}
              {feedback.data?.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(f.submittedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={f.painScore >= 7 ? "destructive" : f.painScore >= 4 ? "secondary" : "default"}>
                      {f.painScore}/10
                    </Badge>
                  </TableCell>
                  <TableCell>{f.completed ? "✓" : "—"}</TableCell>
                  <TableCell className="text-sm">{f.notes ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
