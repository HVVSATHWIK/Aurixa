import React, { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronLeft, Lock, Mail, UserRound, Sparkles } from 'lucide-react';

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
  initialMode = 'signin',
  onBack,
}) {
  const normalizedInitialMode = initialMode === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState(normalizedInitialMode);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(normalizedInitialMode);
    setForm(initialForm);
  }, [normalizedInitialMode]);

  const heading = useMemo(
    () =>
      mode === 'signin'
        ? 'Sign in to the Intelligence Desk'
        : 'Create your AURIXA Operator Identity',
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
    <main className="aurixa-paper-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(17,74,139,0.18),transparent_34%),radial-gradient(circle_at_85%_84%,rgba(190,106,42,0.16),transparent_38%)]" />

      <div className="glass-card relative w-full max-w-6xl rounded-[34px] border border-white/85 p-2">
        <div className="grid overflow-hidden rounded-[28px] bg-white/75 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="border-b border-slate-200 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="brutal-card mb-8 inline-flex items-center gap-3 bg-[#fff9ef] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
              <Bot className="h-4 w-4 text-rose-700" />
              Neural Operations Desk
            </div>

            <h1 className="headline-font max-w-xl text-3xl font-semibold leading-tight text-slate-900 lg:text-5xl">
              A newsroom-grade AI cockpit designed for clarity, speed, and trust.
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-600">
              AURIXA continuously scans, summarizes, translates, and validates business news so operators can move from raw article to publish-ready insight faster.
            </p>

            <div className="mt-8 grid gap-3 text-sm text-slate-700">
              <div className="deck-card px-4 py-3">
                Classy intelligence surfaces with transparent correction history.
              </div>
              <div className="deck-card px-4 py-3">
                Human-friendly controls for URL input, text input, and audio generation.
              </div>
              <div className="deck-card px-4 py-3">
                Built for live demos with robust fallback and readable output.
              </div>
            </div>
          </section>

          <section className="p-8 lg:p-10">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mb-4 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-rose-500 hover:text-rose-700"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Home
              </button>
            )}

            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="headline-font text-3xl text-slate-900">{heading}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {mode === 'signin'
                    ? 'Authenticate and enter the live intelligence workspace.'
                    : 'Register a secure operator identity for your workspace.'}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-amber-700" />
            </div>

            <div className="mb-6 inline-flex rounded-full border border-slate-300 bg-white p-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 transition ${
                  mode === 'signin'
                    ? 'clay-chip text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => onModeSwitch('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 transition ${
                  mode === 'signup'
                    ? 'clay-chip text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => onModeSwitch('signup')}
              >
                Sign Up
              </button>
            </div>

            {!isConfigured && (
              <div className="mb-5 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-900">
                Firebase config is missing. Add values in your .env file from .env.example, then restart npm run dev.
              </div>
            )}

            {authError && (
              <div className="mb-5 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 text-sm text-rose-800">
                {authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="block">
                  <span className="mb-1.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <UserRound className="h-3.5 w-3.5" />
                    Full Name
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    className="skeuo-input w-full px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-500"
                    placeholder="AURIXA Operator"
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  Email Address
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  className="skeuo-input w-full px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-500"
                  placeholder="operator@newsroom.ai"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  className="skeuo-input w-full px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-rose-500"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </label>

              <button
                type="submit"
                className="liquid-highlight w-full rounded-xl border border-slate-900 bg-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isConfigured || isSubmitting}
              >
                {isSubmitting ? 'Authenticating...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-300" />
            </div>

            <button
              type="button"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-rose-500 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
