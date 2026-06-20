import { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { toast } from "sonner";
import { useLocation } from "wouter";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserCog, Search } from "lucide-react";

type Role = "user" | "admin" | "client" | "physiotherapist";
type Status = "active" | "inactive" | "suspended";

function roleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "role.admin";
    case "physiotherapist":
      return "role.physiotherapist";
    case "client":
    case "user":
    default:
      return "role.client";
  }
}

function statusVariant(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "default";
    case "inactive":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}

export default function AdminUsers() {
  const intl = useIntl();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Only admins reach this page meaningfully; others see an empty table (server enforces).
  const filter = useMemo(
    () => ({
      ...(roleFilter === "all" ? {} : { role: roleFilter as Role }),
      ...(statusFilter === "all" ? {} : { status: statusFilter as Status }),
    }),
    [roleFilter, statusFilter]
  );
  const users = trpc.admin.listUsers.useQuery(filter, {
    enabled: !loading && user?.role === "admin",
  });

  const filteredUsers = useMemo(() => {
    if (!users.data) return [];
    return users.data.filter(u => {
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = u.name?.toLowerCase().includes(query) ?? false;
        const emailMatch = u.email?.toLowerCase().includes(query) ?? false;
        return nameMatch || emailMatch;
      }
      return true;
    });
  }, [users.data, searchQuery]);
  const utils = trpc.useUtils();

  const reactivate = trpc.admin.approveUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      toast.success(intl.formatMessage({ id: "admin.toast.reactivated" }));
    },
  });
  const suspend = trpc.admin.suspendUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      toast.success(intl.formatMessage({ id: "admin.toast.inactive" }));
    },
  });
  const del = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      toast.success(intl.formatMessage({ id: "admin.toast.deleted" }));
    },
  });

  const [editing, setEditing] = useState<
    null | NonNullable<typeof users.data>[number]
  >(null);

  if (!loading && user?.role !== "admin") {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>
              <FormattedMessage id="common.notAuthorised" />
            </CardTitle>
            <CardDescription>
              <FormattedMessage id="admin.onlyAdmin" />
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserCog className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <FormattedMessage id="admin.title" />
            </h1>
            <p className="text-sm text-muted-foreground">
              <FormattedMessage id="admin.subtitle" />
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/register")}
          className="w-full md:w-auto"
        >
          <FormattedMessage id="admin.createAccount" />
        </Button>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3 pb-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border rounded-xl text-sm"
              />
            </div>
            <Label className="text-sm">
              <FormattedMessage id="admin.filter.role" />:
            </Label>
            <Select
              value={roleFilter}
              onValueChange={v => setRoleFilter(v as Role | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.formatMessage({ id: "admin.filter.all" })}
                </SelectItem>
                <SelectItem value="admin">
                  {intl.formatMessage({ id: "role.admin" })}
                </SelectItem>
                <SelectItem value="physiotherapist">
                  {intl.formatMessage({ id: "role.physiotherapist" })}
                </SelectItem>
                <SelectItem value="client">
                  {intl.formatMessage({ id: "role.client" })}
                </SelectItem>
              </SelectContent>
            </Select>
            <Label className="text-sm ml-4">
              <FormattedMessage id="admin.filter.status" />:
            </Label>
            <Select
              value={statusFilter}
              onValueChange={v => setStatusFilter(v as Status | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {intl.formatMessage({ id: "admin.filter.all" })}
                </SelectItem>
                <SelectItem value="active">
                  {intl.formatMessage({
                    id:
                      roleFilter === "all"
                        ? "status.active.all"
                        : roleFilter === "admin" || roleFilter === "physiotherapist"
                          ? "status.active.staff"
                          : "status.active",
                  })}
                </SelectItem>
                <SelectItem value="inactive">
                  {intl.formatMessage({ id: "status.inactive" })}
                </SelectItem>
                <SelectItem value="suspended">
                  {intl.formatMessage({ id: "status.suspended" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <FormattedMessage id="admin.column.name" />
                </TableHead>
                <TableHead>
                  <FormattedMessage id="admin.column.email" />
                </TableHead>
                <TableHead>
                  <FormattedMessage id="admin.column.role" />
                </TableHead>
                <TableHead>
                  <FormattedMessage id="admin.column.status" />
                </TableHead>
                <TableHead className="text-right">
                  <FormattedMessage id="admin.column.actions" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    <FormattedMessage id="common.loading" />
                  </TableCell>
                </TableRow>
              )}
              {!users.isLoading && (users.data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    <FormattedMessage id="admin.empty" />
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <FormattedMessage id={roleLabel(u.role)} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        u.status === "active"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 border font-semibold"
                          : u.status === "inactive"
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 border font-semibold"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 border font-semibold"
                      }
                    >
                      <FormattedMessage
                        id={
                          u.status === "active" &&
                          (u.role === "admin" || u.role === "physiotherapist")
                            ? "status.active.staff"
                            : `status.${u.status}`
                        }
                      />
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {u.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reactivate.mutate({ id: u.id })}
                      >
                        <FormattedMessage
                          id={
                            u.status === "inactive"
                              ? "admin.action.approve"
                              : "admin.action.reactivate"
                          }
                        />
                      </Button>
                    )}
                    {u.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => suspend.mutate({ id: u.id })}
                        disabled={u.id === user?.id}
                      >
                        <FormattedMessage id="admin.action.suspend" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(u)}
                    >
                      <FormattedMessage id="admin.action.edit" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={u.id === user?.id}
                      onClick={() => {
                        if (
                          confirm(
                            intl.formatMessage({ id: "admin.confirm.delete" })
                          )
                        )
                          del.mutate({ id: u.id });
                      }}
                    >
                      <FormattedMessage id="admin.action.delete" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditUserDialog
        user={editing}
        onClose={() => setEditing(null)}
        physios={users.data?.filter(u => u.role === "physiotherapist") ?? []}
      />
    </AppShell>
  );
}

function EditUserDialog({
  user,
  physios,
  onClose,
}: {
  user: {
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    status: string;
    physiotherapistId: number | null;
  } | null;
  physios: Array<{ id: number; name: string | null }>;
  onClose: () => void;
}) {
  const intl = useIntl();
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const update = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
      toast.success(intl.formatMessage({ id: "admin.toast.saved" }));
      onClose();
    },
  });
  const resetPassword = trpc.admin.resetPassword.useMutation();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState<Role>((user?.role as Role) ?? "client");
  const [status, setStatus] = useState<Status>(
    (user?.status as Status) ?? "active"
  );
  const [physioId, setPhysioId] = useState<string>(
    user?.physiotherapistId ? String(user.physiotherapistId) : "__none"
  );

  // Reset local state when a new user is loaded into the dialog
  useMemo(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setNewPassword("");
      setRole(user.role as Role);
      setStatus(user.status as Status);
      setPhysioId(
        user.physiotherapistId ? String(user.physiotherapistId) : "__none"
      );
    }
  }, [user?.id]);

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <FormattedMessage id="admin.edit.title" />
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              <FormattedMessage id="admin.edit.name" />
            </Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>
              <FormattedMessage id="admin.edit.email" />
            </Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>New Password (optional)</Label>
            <Input
              type="password"
              placeholder="Min 8 characters to reset password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                <FormattedMessage id="admin.edit.role" />
              </Label>
              {currentUser && currentUser.id === user?.id ? (
                <div className="text-sm text-muted-foreground">
                  <FormattedMessage id={roleLabel(role)} />
                  <div className="text-xs text-muted-foreground">
                    (Cannot change your own role)
                  </div>
                </div>
              ) : (
                <Select value={role} onValueChange={v => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      {intl.formatMessage({ id: "role.admin" })}
                    </SelectItem>
                    <SelectItem value="physiotherapist">
                      {intl.formatMessage({ id: "role.physiotherapist" })}
                    </SelectItem>
                    <SelectItem value="client">
                      {intl.formatMessage({ id: "role.client" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                <FormattedMessage id="admin.edit.status" />
              </Label>
              {currentUser && currentUser.id === user?.id ? (
                <div className="text-sm text-muted-foreground">
                  {intl.formatMessage({
                    id:
                      status === "active" &&
                      (role === "admin" || role === "physiotherapist")
                        ? "status.active.staff"
                        : `status.${status}`,
                  })}
                  <div className="text-xs text-muted-foreground">
                    (Cannot change your own status)
                  </div>
                </div>
              ) : (
                <Select
                  value={status}
                  onValueChange={v => setStatus(v as Status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {intl.formatMessage({
                        id:
                          role === "admin" || role === "physiotherapist"
                            ? "status.active.staff"
                            : "status.active",
                      })}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {intl.formatMessage({ id: "status.inactive" })}
                    </SelectItem>
                    <SelectItem value="suspended">
                      {intl.formatMessage({ id: "status.suspended" })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {role === "client" && (
            <div className="space-y-1.5">
              <Label>
                <FormattedMessage id="admin.edit.physio" />
              </Label>
              <Select value={physioId} onValueChange={setPhysioId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">—</SelectItem>
                  {physios.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name ?? `#${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <FormattedMessage id="admin.edit.cancel" />
          </Button>
          <Button
            disabled={update.isPending || resetPassword.isPending}
            onClick={async () => {
              if (!user) return;
              try {
                await update.mutateAsync({
                  id: user.id,
                  patch: {
                    name: name || null,
                    email: email || null,
                    role,
                    status,
                    physiotherapistId:
                      role === "client"
                        ? physioId === "__none"
                          ? null
                          : Number(physioId)
                        : null,
                  },
                });

                if (newPassword.trim().length >= 8) {
                  await resetPassword.mutateAsync({
                    id: user.id,
                    password: newPassword.trim(),
                  });
                }
              } catch (err) {
                const msg =
                  err instanceof Error
                    ? err.message
                    : "Failed to save changes.";
                toast.error(msg);
              }
            }}
          >
            <FormattedMessage id="admin.edit.save" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
