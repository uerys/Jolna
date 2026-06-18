import { LoginForm } from "@/components/login-form";

export default function Login() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 p-6 md:p-10 font-sans">
      <div className="w-full max-w-md border border-gray-200/80 rounded-2xl bg-white shadow-sm p-6 md:p-10 lg:p-12">
        <LoginForm />
      </div>
    </div>
  );
}
