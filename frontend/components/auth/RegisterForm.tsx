"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getAccessToken, syncProfile } from "@/lib/auth";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const btnClass =
  "w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50";

export default function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "creator">("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail =
          typeof body.detail === "string"
            ? body.detail
            : "Registration failed. Check Supabase settings in .env.local.";
        setError(
          body.needs_confirmation
            ? `${detail} You can sign in after confirming.`
            : detail,
        );
        setLoading(false);
        return;
      }

      const token = await getAccessToken();
      if (token) {
        try {
          await syncProfile(token);
        } catch {
          // Best-effort
        }
      }

      router.push("/choose-plan");
      router.refresh();
    } catch {
      setError(
        "Could not reach the server. Use http://localhost:3000 and ensure npm run dev is running.",
      );
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Full name
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={`mt-1.5 ${inputClass}`}
          placeholder="Alex Student"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`mt-1.5 ${inputClass}`}
          placeholder="you@school.edu"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`mt-1.5 ${inputClass}`}
          placeholder="At least 8 characters"
        />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          I am a…
        </legend>
        <RolePicker role={role} setRole={setRole} />
      </fieldset>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={btnClass}>
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function RolePicker({
  role,
  setRole,
}: {
  role: "student" | "creator";
  setRole: (r: "student" | "creator") => void;
}) {
  const options: { value: "student" | "creator"; label: string }[] = [
    { value: "student", label: "Student" },
    { value: "creator", label: "Creator" },
  ];
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setRole(opt.value)}
          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
            role === opt.value
              ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"
              : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
