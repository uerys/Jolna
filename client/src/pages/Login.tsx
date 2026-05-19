import { useLocation } from "wouter";
import LoginPage from "../../../components/LoginPage";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const loginMutation = trpc.auth.login.useMutation();

  return (
    <LoginPage
      onLogin={async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
        await utils.auth.me.invalidate();
        navigate("/");
      }}
    />
  );
}