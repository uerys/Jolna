import { SignupForm } from "@/components/signup-form";

import { Link } from "wouter";

export default function Register() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 p-6 md:p-10 font-sans relative">
      <div className="absolute top-6 left-6 md:top-10 md:left-10">
        <Link
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
        </Link>
      </div>
      <div className="w-full max-w-md border border-gray-200/80 rounded-2xl bg-white shadow-sm p-6 md:p-10 lg:p-12">
        <SignupForm />
      </div>
    </div>
  );
}
