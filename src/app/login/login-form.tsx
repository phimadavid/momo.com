"use client";

import { useActionState, useId, useState } from "react";

import { AlertIcon, ArrowRightIcon, LockIcon } from "~/app/_components/icons";
// Accounts created by `npm run db:seed`, offered as one-tap fill.
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "~/server/demo/accounts";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Sign in with your school account to reach your courses, grading queue and
        assessments.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        {state.error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            <AlertIcon className="mt-px size-4 shrink-0" />
            {state.error}
          </p>
        )}

        <div>
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            School email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@momosmart.edu"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor={passwordId} className="text-sm font-semibold text-ink">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-deep focus:ring-4 focus:ring-navy/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Signing in…" : "Sign in"}
          {!pending && (
            <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <LockIcon className="size-3.5" />
          Sessions last 12 hours and are signed on the server.
        </p>
      </form>

      <div className="mt-8 rounded-2xl border border-line bg-canvas p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Demo accounts
        </p>
        <p className="mt-1 text-xs text-muted">
          Seeded by <code className="font-semibold">npm run db:seed</code>. Password:{" "}
          <code className="font-semibold text-ink">{DEMO_PASSWORD}</code>
        </p>
        <div className="mt-3 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword(DEMO_PASSWORD);
              }}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-brand-soft"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {account.name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {account.email}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                {account.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
