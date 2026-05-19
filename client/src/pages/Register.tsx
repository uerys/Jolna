import { useLocation } from "wouter";
import RegisterPage from "../../../components/RegisterPage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const createUserMutation = trpc.admin.createUser.useMutation();

  if (!loading && user?.role !== "admin") {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can create user accounts.</CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <RegisterPage
      onRegister={async (name, email, password) => {
        await createUserMutation.mutateAsync({ name, email, password, role: "client", status: "active" });
        await utils.admin.listUsers.invalidate();
        navigate("/admin/users");
      }}
      pageTitle="Create New Account"
      pageSubtitle="Create a new user account for your clinic"
    />
  );
}