import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import AppShell from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { UserCog, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { validateCambodianPhoneNumber } from "@shared/phoneValidation";

function makeInitials(
  name: string | null | undefined,
  email: string | null | undefined
) {
  return (
    (name ?? email ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default function Profile() {
  const intl = useIntl();
  const [, navigate] = useLocation();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const profile = trpc.settings.getMyProfile.useQuery(undefined, {
    enabled: !loading && !!user,
  });
  const role = profile.data?.user.role ?? user?.role;
  const admins = trpc.settings.getAdminsContacts.useQuery(undefined, {
    enabled:
      !loading &&
      !!user &&
      (role === "client" || role === "physiotherapist" || role === "user"),
  });

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const updatePassword = trpc.settings.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: err => {
      toast.error(err.message || "Failed to update password");
    },
  });
  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.user.name ?? "");
    setPhoneNumber(
      (profile.data.user as { phoneNumber?: string | null }).phoneNumber ?? ""
    );
    setAvatarUrl(
      (profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null
    );
    setAvatarPreview(
      (profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null
    );
  }, [profile.data]);

  const updateProfile = trpc.settings.updateMyProfile.useMutation({
    onSuccess: async updated => {
      await Promise.all([
        utils.settings.getMyProfile.invalidate(),
        utils.auth.me.invalidate(),
      ]);
      if (!updated) return;
      setName(updated.name ?? "");
      setPhoneNumber(
        (updated as { phoneNumber?: string | null }).phoneNumber ?? ""
      );
      setAvatarUrl(
        (updated as { avatarUrl?: string | null }).avatarUrl ?? null
      );
      setAvatarPreview(
        (updated as { avatarUrl?: string | null }).avatarUrl ?? null
      );
      toast.success("Saved successfully");
    },
    onError: () => {
      toast.error("Profile was not saved. Please try again.");
    },
  });
  const requestReset = trpc.settings.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Password reset request sent to administrators.");
    },
    onError: err => {
      toast.error(err.message || "Failed to send reset request.");
    },
  });

  const userInitials = useMemo(
    () => makeInitials(profile.data?.user.name, profile.data?.user.email),
    [profile.data?.user.email, profile.data?.user.name]
  );

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 1_500_000) {
      toast.error("Image is too large. Please use a file under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;
      setAvatarPreview(result);
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }

  async function onSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Display name is required.");
      return;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !validateCambodianPhoneNumber(trimmedPhone)) {
      toast.error("Invalid Cambodian phone number.");
      return;
    }

    await updateProfile.mutateAsync({
      name: trimmedName,
      phoneNumber: trimmedPhone || null,
      avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
    });
  }

  if (!loading && !user) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>
              <FormattedMessage id="common.notAuthorised" />
            </CardTitle>
            <CardDescription>
              Please sign in to view your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const roleLabel =
    role === "physiotherapist"
      ? "role.physiotherapist"
      : role === "admin"
        ? "role.admin"
        : "role.client";
  const assignedClients = (profile.data?.assignedClients ?? []) as Array<{
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  }>;

  const goBackPath =
    role === "admin"
      ? "/admin/users"
      : role === "physiotherapist"
        ? "/physio"
        : "/client/exercises";

  return (
    <AppShell>
      <div className="mb-4">
        <Button
          onClick={() => navigate(goBackPath)}
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-[#534AB7] hover:bg-indigo-50/50 transition-colors"
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <UserCog className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Update your name, phone number, and profile picture.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr] mt-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Basic profile settings for your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
                <Avatar className="h-24 w-24 border">
                  <AvatarImage
                    src={avatarPreview ?? undefined}
                    alt={
                      profile.data?.user.name ??
                      profile.data?.user.email ??
                      "Profile"
                    }
                  />
                  <AvatarFallback className="text-2xl font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <Label htmlFor="avatarUpload">Profile picture</Label>
                  <Input
                    id="avatarUpload"
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a PNG, JPG, or WEBP image under 1.5 MB.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={event => setPhoneNumber(event.target.value)}
                  placeholder="Your phone number"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void onSave()}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? "Saving..." : "Save profile"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAvatarUrl(null);
                    setAvatarPreview(null);
                  }}
                  disabled={updateProfile.isPending}
                >
                  Remove picture
                </Button>
              </div>

              <div className="border-t border-slate-100 my-6 pt-6 space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Change Password</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm New Password</Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={e => setShowPassword(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Show Passwords
                  </label>
                </div>

                <Button
                  onClick={() => {
                    if (!currentPassword.trim()) {
                      toast.error("Current password is required.");
                      return;
                    }
                    if (newPassword.length < 8) {
                      toast.error(
                        "New password must be at least 8 characters."
                      );
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error("Passwords do not match.");
                      return;
                    }
                    updatePassword.mutate({ currentPassword, newPassword });
                  }}
                  disabled={updatePassword.isPending}
                >
                  {updatePassword.isPending ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="secondary">
                  <FormattedMessage id={roleLabel} />
                </Badge>
              </div>
              {role === "client" && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    className={
                      profile.data?.user.status === "active"
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 border font-semibold shadow-none"
                        : profile.data?.user.status === "inactive"
                          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 border font-semibold shadow-none"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 border font-semibold shadow-none"
                    }
                  >
                    <FormattedMessage
                      id={`status.${profile.data?.user.status}`}
                    />
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Phone Number
                </span>
                <span className="text-sm font-medium">
                  {profile.data?.user.phoneNumber ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {(role === "client" || role === "user") && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Physiotherapist</CardTitle>
                <CardDescription>
                  Your rehab plan can show the physiotherapist responsible for
                  your care.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.data?.physiotherapist ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage
                        src={
                          profile.data.physiotherapist.avatarUrl ?? undefined
                        }
                        alt={
                          profile.data.physiotherapist.name ??
                          profile.data.physiotherapist.email ??
                          "Physiotherapist"
                        }
                      />
                      <AvatarFallback className="text-xs font-medium">
                        {makeInitials(
                          profile.data.physiotherapist.name,
                          profile.data.physiotherapist.email
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {profile.data.physiotherapist.name ??
                          profile.data.physiotherapist.email ??
                          `#${profile.data.physiotherapist.id}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {profile.data.physiotherapist.email ?? ""}
                      </div>
                      {profile.data.physiotherapist.phoneNumber ? (
                        <div className="mt-1">
                          <div className="text-sm font-medium">
                            {profile.data.physiotherapist.phoneNumber}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No physiotherapist assigned yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {(role === "client" ||
            role === "physiotherapist" ||
            role === "user") && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Admin</CardTitle>
                <CardDescription>
                  If you need help, contact your clinic administrator.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {admins.isLoading && (
                  <p className="text-sm text-muted-foreground">
                    Loading admins…
                  </p>
                )}
                {!admins.isLoading &&
                  (!admins.data || admins.data.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      No admin contact available.
                    </p>
                  )}
                {!admins.isLoading && admins.data && admins.data.length > 0 && (
                  <div className="space-y-3">
                    {admins.data.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-medium">
                            {a.name ?? a.email ?? `#${a.id}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {a.email ?? ""}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {a.phoneNumber ?? "No phone"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <Button
                    onClick={() => requestReset.mutate()}
                    disabled={requestReset.isPending}
                    variant="outline"
                    className="w-full text-xs font-semibold"
                  >
                    {requestReset.isPending
                      ? "Sending Request..."
                      : "Request Password Reset"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
