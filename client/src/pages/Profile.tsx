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

function openTelegramWithFallback(phoneNumber: string | null | undefined) {
  let digits = phoneNumber?.replace(/\D/g, "");
  if (!digits) return;
  // If number is in local format starting with 0, replace leading 0 with Cambodia country code 855
  if (digits.startsWith("0")) {
    digits = `855${digits.slice(1)}`;
  }
  const tg = `tg://resolve?phone=${digits}`;
  const web = `https://t.me/+${digits}`;

  // Try opening the native app first. If it doesn't open, fallback to web after delay.
  // Use a small timeout to allow the protocol handler to run.
  const fallback = () => window.open(web, "_blank");
  const timer = window.setTimeout(fallback, 700);

  try {
    // attempt to open native handler
    window.location.href = tg;
  } catch (err) {
    // if navigation fails, immediately fallback
    window.clearTimeout(timer);
    fallback();
  }
}

export default function Profile() {
  const intl = useIntl();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const profile = trpc.settings.getMyProfile.useQuery(undefined, {
    enabled: !loading && !!user,
  });
  const role = profile.data?.user.role ?? user?.role;
  const admins = trpc.settings.getAdminsContacts.useQuery(undefined, {
    enabled: !loading && !!user && (role === "client" || role === "physiotherapist" || role === "user"),
  });

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.user.name ?? "");
    setPhoneNumber((profile.data.user as { phoneNumber?: string | null }).phoneNumber ?? "");
    setAvatarUrl((profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null);
    setAvatarPreview((profile.data.user as { avatarUrl?: string | null }).avatarUrl ?? null);
  }, [profile.data]);

  const updateProfile = trpc.settings.updateMyProfile.useMutation({
    onSuccess: async (updated) => {
      await Promise.all([utils.settings.getMyProfile.invalidate(), utils.auth.me.invalidate()]);
      if (!updated) return;
      setName(updated.name ?? "");
      setPhoneNumber((updated as { phoneNumber?: string | null }).phoneNumber ?? "");
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
      phoneNumber: phoneNumber.trim() || null,
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
  const assignedClients = (profile.data?.assignedClients ?? []) as Array<{
    id: number;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
    phoneNumber?: string | null;
  }>;

  return (
    <AppShell>
      <div className="flex items-center gap-3">
        <UserCog className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your name, phone number, and profile picture.
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

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Your phone number"
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
                <Badge className={`border-transparent text-white ${
                  profile.data?.user.status === "active" ? "bg-emerald-600 hover:bg-emerald-700" :
                  profile.data?.user.status === "suspended" ? "bg-red-600 hover:bg-red-700" :
                  "bg-gray-500 hover:bg-gray-600"
                }`}>
                  {profile.data?.user.status ? profile.data.user.status.charAt(0).toUpperCase() + profile.data.user.status.slice(1) : "Active"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Phone Number</span>
                <span className="text-sm font-medium">{profile.data?.user.phoneNumber ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          {(role === "client" || role === "user") && (
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
                      {profile.data.physiotherapist.phoneNumber ? (
                        <div className="mt-1">
                          <div className="text-sm font-medium">{profile.data.physiotherapist.phoneNumber}</div>
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              openTelegramWithFallback(profile.data?.physiotherapist?.phoneNumber);
                            }}
                            className="text-xs text-blue-600 hover:underline mt-1"
                          >
                            Telegram Contact Link
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No physiotherapist assigned yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {(role === "client" || role === "physiotherapist" || role === "user") && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Admin</CardTitle>
                <CardDescription>If you need help, contact your clinic administrator via Telegram Contact Link.</CardDescription>
              </CardHeader>
              <CardContent>
                {admins.isLoading && <p className="text-sm text-muted-foreground">Loading admins…</p>}
                {!admins.isLoading && (!admins.data || admins.data.length === 0) && (
                  <p className="text-sm text-muted-foreground">No admin contact available.</p>
                )}
                {!admins.isLoading && admins.data && admins.data.length > 0 && (
                  <div className="space-y-3">
                    {admins.data.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{a.name ?? a.email ?? `#${a.id}`}</div>
                          <div className="text-sm text-muted-foreground">{a.email ?? ""}</div>
                          <div className="text-sm text-muted-foreground">{a.phoneNumber ?? "No phone"}</div>
                        </div>
                        {a.phoneNumber ? (
                          <Button
                            variant="outline"
                            size={"sm" as any}
                            onClick={() => openTelegramWithFallback(a.phoneNumber)}
                            className="text-xs"
                          >
                            Telegram Contact Link
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">No phone</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Transparency Notice */}
          <Card className="border-muted">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Data Transparency:</strong> Your pain scores, completion status, and notes can be viewed by your assigned physiotherapist for rehabilitation monitoring. Your phone number may be visible to authorized clinic staff for contact purposes. Telegram is used only as an external contact link — messages are not stored inside JOLNA.
              </p>
            </CardContent>
          </Card>

          {role === "physiotherapist" && (
            <Card>
              <CardHeader>
                <CardTitle>Assigned Clients</CardTitle>
                <CardDescription>
                  Active clients currently assigned to your care.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedClients.length > 0 ? (
                  assignedClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={client.avatarUrl ?? undefined} alt={client.name ?? client.email ?? "Client"} />
                          <AvatarFallback className="text-xs font-medium">
                            {makeInitials(client.name, client.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{client.name ?? client.email ?? `#${client.id}`}</div>
                          <div className="text-sm text-muted-foreground truncate">{client.email ?? ""}</div>
                          {client.phoneNumber ? (
                            <div className="mt-1">
                              <div className="text-sm font-medium">{client.phoneNumber}</div>
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openTelegramWithFallback(client.phoneNumber);
                                }}
                                className="text-xs text-blue-600 hover:underline mt-1"
                              >
                                Telegram Contact Link
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-700">
                        Active
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active clients assigned yet.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}