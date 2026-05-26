"use client";

import { useState, type ComponentProps } from "react";

type LoginPageProps = {
  onLogin?: (email: string, password: string) => Promise<void> | void;
};

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

export default function LoginPage({ onLogin }: Readonly<LoginPageProps>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit: FormSubmitHandler = (event) => {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-gray-900 shadow-sm">
        <h2 className="mb-8 text-center text-3xl font-semibold">
          Welcome Backss
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-gray-900 placeholder:text-gray-400 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 pr-12 text-gray-900 placeholder:text-gray-400 transition focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              aria-label="Toggle password visibility"
            >
              <svg
                id="eyeOpen"
                className={`h-6 w-6 ${showPassword ? "hidden" : ""}`}
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
                className={`h-6 w-6 ${showPassword ? "" : "hidden"}`}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 text-center text-sm text-red-500">{error}</p>
        ) : null}

        <p className="mt-6 text-center text-sm text-gray-500">
          Contact your administrator to create an account.
        </p>
      </div>
    </main>
  );
}
