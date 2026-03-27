import React from 'react';
import NavBar from './components/NavBar';
import TelemetryPanel from './components/TelemetryPanel';
import Pipeline from './components/Pipeline';
import IntelligencePanel from './components/IntelligencePanel';
import AuditPanel from './components/AuditPanel';
import AuthScreen from './components/AuthScreen';
import { useAurixaAuth } from './hooks/useAurixaAuth';
import { useAurixaRealtimeState } from './hooks/useAurixaRealtimeState';

function App() {
  const {
    user,
    loading,
    authError,
    isConfigured,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOutUser,
  } = useAurixaAuth();

  const { state, connection } = useAurixaRealtimeState({
    enabled: Boolean(user),
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-4 text-sm uppercase tracking-[0.24em] text-cyan-200 animate-pulse">
          Bootstrapping AURIXA
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authError={authError}
        isConfigured={isConfigured}
        onEmailSignIn={signInWithEmail}
        onEmailSignUp={signUpWithEmail}
        onGoogleSignIn={signInWithGoogle}
      />
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-aurixa-bg text-slate-300 font-sans">
      <NavBar state={state} connection={connection} user={user} onSignOut={signOutUser} />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <TelemetryPanel state={state} />
        <Pipeline state={state} />
        <IntelligencePanel state={state} />
      </div>

      <AuditPanel state={state} />
    </div>
  );
}

export default App;
