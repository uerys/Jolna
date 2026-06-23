import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email to request a password reset.");
      return;
    }
    setError("");
    setResetSent(false);

    forgotPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setResetSent(true);
        },
        onError: err => {
          setError(err.message || "Failed to request password reset.");
        },
      }
    );
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 p-6 md:p-10 font-sans relative">
      <div className="absolute top-6 left-6 md:top-10 md:left-10">
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Login
        </Link>
      </div>
      <div className="w-full max-w-md border border-gray-200/80 rounded-2xl bg-white shadow-sm p-6 md:p-10 lg:p-12">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Forgot Password</h1>
            <p className="text-balance text-sm text-muted-foreground font-sans">
              Enter your email to request a password reset.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-gray-800"
                htmlFor="email"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full"
            >
              {forgotPasswordMutation.isPending
                ? "Sending request..."
                : "Send Reset Link"}
            </button>
          </div>
        </form>
        {error && (
          <p className="mt-4 text-center text-sm text-red-500">{error}</p>
        )}
        {resetSent && (
          <p className="mt-4 text-center text-sm text-green-600 font-medium">
            If your email is registered, we have sent a reset request to the
            administrators.
          </p>
        )}
      </div>
    </div>
  );
}
