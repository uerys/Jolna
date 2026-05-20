import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import AppShell from "@/components/AppShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { UserCog } from "lucide-react";
import { toast } from "sonner";

function makeInitials(name: string | null | undefined, email: string | null | undefined) {
  return (
    (name ?? email ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default function Profile() {
  const intl = useIntl();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const profile = trpc.settings.getMyProfile.useQuery(undefined, {
    enabled: !loading && !!user,
  });
  const role = profile.data?.user.role ?? user?.role;

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.user.name ?? "");
    setAvatarUrl((profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null);
    setAvatarPreview((profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null);
  }, [profile.data]);

  const updateProfile = trpc.settings.updateMyProfile.useMutation({
    onSuccess: async (updated) => {
      await Promise.all([utils.settings.getMyProfile.invalidate(), utils.auth.me.invalidate()]);
      if (!updated) return;
      setName(updated.name ?? "");
      setAvatarUrl((updated as { avatarUrl?: string | null }).avatarUrl ?? null);
      setAvatarPreview((updated as { avatarUrl?: string | null }).avatarUrl ?? null);
      toast.success("Saved successfully");
    },
    onError: () => {
      toast.error("Profile was not saved. Please try again.");
    },
  });

  const userInitials = useMemo(
    () => makeInitials(profile.data?.user.name, profile.data?.user.email),
    [profile.data?.user.email, profile.data?.user.name],
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

    await updateProfile.mutateAsync({
      name: trimmedName,
      avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : null,
    });
  }

  if (!loading && !user) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle><FormattedMessage id="common.notAuthorised" /></CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const roleLabel = role === "physiotherapist"
    ? "role.physiotherapist"
    : role === "admin"
      ? "role.admin"
      : "role.client";

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <UserCog className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your name and profile picture.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr] mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Basic profile settings for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
              <Avatar className="h-24 w-24 border">
                <AvatarImage src={avatarPreview ?? undefined} alt={profile.data?.user.name ?? profile.data?.user.email ?? "Profile"} />
                <AvatarFallback className="text-2xl font-semibold">{userInitials}</AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <Label htmlFor="avatarUpload">Profile picture</Label>
                <Input id="avatarUpload" type="file" accept="image/*" onChange={onFileChange} />
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
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void onSave()} disabled={updateProfile.isPending}>
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
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="secondary"><FormattedMessage id={roleLabel} /></Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge>{profile.data?.user.status ?? "—"}</Badge>
              </div>
            </CardContent>
          </Card>

          {role !== "physiotherapist" && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Physiotherapist</CardTitle>
                <CardDescription>
                  Your rehab plan can show the physiotherapist responsible for your care.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.data?.physiotherapist ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={profile.data.physiotherapist.avatarUrl ?? undefined} alt={profile.data.physiotherapist.name ?? profile.data.physiotherapist.email ?? "Physiotherapist"} />
                      <AvatarFallback className="text-xs font-medium">{makeInitials(profile.data.physiotherapist.name, profile.data.physiotherapist.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{profile.data.physiotherapist.name ?? profile.data.physiotherapist.email ?? `#${profile.data.physiotherapist.id}`}</div>
                      <div className="text-sm text-muted-foreground">{profile.data.physiotherapist.email ?? ""}</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No physiotherapist assigned yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}