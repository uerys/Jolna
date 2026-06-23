"use client";

import { useState, type ComponentProps } from "react";

type LoginPageProps = {
  onLogin?: (email: string, password: string) => Promise<void> | void;
  onLoginWithGoogle?: () => Promise<void> | void;
  onForgotPassword?: (email: string) => Promise<void> | void;
};

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

export default function LoginPage({
  onLogin,
  onLoginWithGoogle,
  onForgotPassword,
}: Readonly<LoginPageProps>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit: FormSubmitHandler = event => {
    event.preventDefault();
    setError("");

    void (async () => {
      if (!email.trim() || !password.trim()) {
        setError("Email and password are required.");
        return;
      }

      try {
        setLoading(true);
        await onLogin?.(email, password);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed.");
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleGoogleClick = () => {
    if (!onLoginWithGoogle) return;
    setError("");
    setGoogleLoading(true);
    void (async () => {
      try {
        await onLoginWithGoogle();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google login failed.");
      } finally {
        setGoogleLoading(false);
      }
    })();
  };
  const handleForgotPassword = () => {
    if (!onForgotPassword) return;
    if (!email.trim()) {
      setError("Please enter your email to request a password reset.");
      return;
    }
    setError("");
    setResetSent(false);
    setResetLoading(true);
    void (async () => {
      try {
        await onForgotPassword(email);
        setResetSent(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to request password reset."
        );
      } finally {
        setResetLoading(false);
      }
    })();
  };

  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-8 flex items-center justify-center font-sans">
      <div className="w-full max-w-[1100px] min-h-[600px] border border-gray-200/80 rounded-[32px] bg-white overflow-hidden shadow-sm flex flex-col lg:flex-row">
        {/* Left Column (Sign-in form) */}
        <div className="flex w-full lg:w-1/2 flex-col justify-between p-8 md:p-12 lg:p-16">
          {/* Top nav */}
          <div className="flex items-center justify-between select-none mb-8 lg:mb-0">
            <a
              href="/"
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
              Back to Home
            </a>
            <img
              src="/logo.png"
              alt="JOLNA Logo"
              className="w-8 h-8 object-contain"
            />
          </div>

          {/* Center content container */}
          <div className="mx-auto my-auto w-full max-w-[380px] space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed font-normal">
                Log in to unlock tailored content and stay connected with your
                community.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="Toggle password visibility"
                  >
                    <svg
                      id="eyeOpen"
                      className={`h-5 w-5 ${showPassword ? "hidden" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <svg
                      id="eyeClosed"
                      className={`h-5 w-5 ${showPassword ? "" : "hidden"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.19-3.344m2.864-2.863A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.11 2.158M3 3l18 18"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-600 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  Keep me signed in
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-gray-500 hover:text-gray-800 hover:underline font-medium disabled:opacity-50"
                >
                  {resetLoading ? "Sending..." : "Forgot password?"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#111111] hover:bg-[#222222] py-3 text-sm font-semibold text-white transition disabled:opacity-60 mt-2"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-xs uppercase tracking-wider text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={googleLoading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {googleLoading ? "Signing in..." : "Login with Google"}
            </button>
            {resetSent && (
              <p className="mt-4 text-center text-sm text-green-600 font-medium">
                If your email is registered, we have sent a reset request to the
                administrators.
              </p>
            )}

            {error ? (
              <p className="mt-4 text-center text-sm text-red-500">{error}</p>
            ) : null}

            <p className="text-center text-sm text-gray-500 pt-2">
              Don't have an account?{" "}
              <button
                type="button"
                className="font-semibold text-gray-900 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>

          {/* Bottom spacer / hidden on desktop to keep form centered */}
          <div className="hidden lg:block h-8" />
        </div>

        {/* Right Column (Illustration) */}
        <div className="hidden lg:flex lg:w-1/2 p-6 select-none bg-white">
          <div className="w-full h-full bg-[#f3f4f6] rounded-[24px] flex items-center justify-center relative overflow-hidden min-h-[500px]">
            {/* Subtle concentric circles & radial lines decoration */}
            <div className="absolute h-[420px] w-[420px] rounded-full border border-gray-200/50 flex items-center justify-center">
              <div className="h-[300px] w-[300px] rounded-full border border-gray-200/70 flex items-center justify-center">
                <div className="h-[200px] w-[200px] rounded-full border border-gray-200 flex items-center justify-center" />
              </div>
            </div>
            <div className="absolute h-[420px] w-[1px] bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            <div className="absolute w-[420px] h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="absolute h-[420px] w-[1px] rotate-45 bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
            <div className="absolute h-[420px] w-[1px] -rotate-45 bg-gradient-to-b from-transparent via-gray-200 to-transparent" />

            {/* Central card/icon */}
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[20px] border border-gray-200 bg-white shadow-sm">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
