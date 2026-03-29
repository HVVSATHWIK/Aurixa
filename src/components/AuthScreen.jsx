import React, { useEffect, useMemo, useState } from 'react';
import { Bot, ChevronLeft, Lock, Mail, UserRound, Sparkles } from 'lucide-react';

const initialForm = {
  name: '',
  email: '',
  password: '',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.9 2.9 14.7 2 12 2 6.8 2 2.6 6.5 2.6 12S6.8 22 12 22c6.9 0 9.2-4.9 9.2-7.4 0-.5 0-.9-.1-1.3H12z"
      />
      <path
        fill="#34A853"
        d="M3.7 7.4l3.2 2.4C7.8 7.8 9.7 6.3 12 6.3c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.4z"
      />
      <path
        fill="#4A90E2"
        d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1.1-3.5 1.1-3.9 0-5.2-2.6-5.5-3.9L3.2 17C4.8 20 8.1 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M3.1 7.4C2.4 8.8 2 10.4 2 12s.4 3.2 1.1 4.6l3.2-2.5c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1L3.1 7.4z"
      />
    </svg>
  );
}

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
        ? 'Sign in to the Intelligence Workspace'
        : 'Create your AURIXA Operator Account',
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
              A newsroom-grade AI workspace designed for clarity, speed, and trust.
            </h1>

            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-600">
              AURIXA continuously analyzes, summarizes, translates, and validates business news so teams can move from raw article input to publication-ready insight with confidence.
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
                    ? 'Authenticate to access live intelligence, audit logs, and newsroom outputs.'
                    : 'Register a secure operator account for your newsroom workspace.'}
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

              <p className="text-xs leading-relaxed text-slate-500">
                By continuing, you agree to AURIXA Terms of Use and Privacy Notice. Do not use this system as the sole basis for financial or legal decisions.
              </p>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-300" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-300" />
            </div>

            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-rose-500 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onGoogleSignIn}
              disabled={!isConfigured || isSubmitting}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              Secure sign-in is provided by Firebase Authentication.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
