import React, { useMemo, useState } from 'react';
import { Bot, Lock, Mail, UserRound, Sparkles } from 'lucide-react';

const initialForm = {
  name: '',
  email: '',
  password: '',
};

export default function AuthScreen({
  authError,
  isConfigured,
  onEmailSignIn,
  onEmailSignUp,
  onGoogleSignIn,
}) {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading = useMemo(
    () =>
      mode === 'signin'
        ? 'Sign in to Autonomous Operations'
        : 'Create your AURIXA Control Identity',
    [mode]
  );

  const onModeSwitch = (nextMode) => {
    setMode(nextMode);
    setForm(initialForm);
  };

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isConfigured || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await onEmailSignIn(form.email.trim(), form.password);
      } else {
        await onEmailSignUp({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_80%_78%,rgba(168,85,247,0.12),transparent_38%)]" />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-[0_40px_120px_rgba(2,6,23,0.6)] backdrop-blur-xl">
        <div className="grid lg:grid-cols-[1.05fr_1fr]">
          <section className="border-b border-slate-800/70 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="mb-10 inline-flex items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-cyan-200">
              <Bot className="h-4 w-4" />
              Agentic Compliance Engine
            </div>

            <h1 className="max-w-xl text-3xl font-semibold leading-tight text-slate-100 lg:text-4xl">
              Enterprise content operations with autonomous correction loops.
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-400">
              AURIXA continuously detects violations, proposes fixes, applies corrections,
              and re-validates until compliant output is ready for approval.
            </p>

            <div className="mt-8 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                Compliance and editor agents iterate autonomously in real time.
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                Every step is auditable with risk, confidence, and correction traces.
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                Transport-aware stream status keeps pipeline visibility reliable.
              </div>
            </div>
          </section>

          <section className="p-8 lg:p-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">{heading}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {mode === 'signin'
                    ? 'Authenticate and enter the live observability deck.'
                    : 'Register a secure operator identity for your workspace.'}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>

            <div className="mb-6 inline-flex rounded-full border border-slate-800 bg-slate-950 p-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 transition ${
                  mode === 'signin'
                    ? 'bg-cyan-500/15 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => onModeSwitch('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 transition ${
                  mode === 'signup'
                    ? 'bg-violet-500/20 text-violet-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => onModeSwitch('signup')}
              >
                Sign Up
              </button>
            </div>

            {!isConfigured && (
              <div className="mb-5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Firebase config is missing. Add values in your .env file from .env.example, then restart npm run dev.
              </div>
            )}

            {authError && (
              <div className="mb-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-1.5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <UserRound className="h-3.5 w-3.5" />
                    Full Name
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-violet-400/60"
                    placeholder="AURIXA Operator"
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
                  placeholder="operator@enterprise.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isConfigured || isSubmitting}
              >
                {isSubmitting ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-300/50 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onGoogleSignIn}
              disabled={!isConfigured || isSubmitting}
            >
              Continue with Google
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
