import React, { useEffect, useMemo, useState } from 'react';
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

  const {
    state,
    connection,
    analyzeArticle,
    generateAudio,
    getAudioJob,
  } = useAurixaRealtimeState({
    enabled: Boolean(user),
  });

  const [analysisPending, setAnalysisPending] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [audioPending, setAudioPending] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioJob, setAudioJob] = useState(null);

  const studio = state?.studio || {
    audio_status: '',
    audio_job_id: '',
    audio_message: '',
    audio_url: '',
  };
  const liveAudioStatus = audioJob?.status || studio.audio_status;
  const liveAudioUrl = audioJob?.audio_url || studio.audio_url;
  const liveAudioMessage = audioJob?.message || studio.audio_message;

  const hasLiveIntelligence = useMemo(
    () => Boolean(state?.intelligence?.generated_at),
    [state]
  );

  useEffect(() => {
    if (!user) {
      setAnalysisPending(false);
      setAudioPending(false);
      setAnalysisError('');
      setAudioError('');
      setAudioJob(null);
    }
  }, [user]);

  useEffect(() => {
    const jobId = studio.audio_job_id || audioJob?.job_id;
    const status = (audioJob?.status || studio.audio_status || '').toLowerCase();

    if (!jobId) {
      return () => {};
    }

    if (!['queued', 'running'].includes(status)) {
      setAudioPending(false);
      return () => {};
    }

    let cancelled = false;
    let timeoutId;

    const tick = async () => {
      try {
        const payload = await getAudioJob(jobId);
        if (cancelled) {
          return;
        }

        const nextJob = payload?.job || null;
        if (nextJob) {
          setAudioJob(nextJob);
          const nextStatus = String(nextJob.status || '').toLowerCase();
          if (nextStatus === 'completed' || nextStatus === 'failed') {
            setAudioPending(false);
            return;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAudioError(error?.message || 'Unable to fetch audio job status.');
        }
      }

      timeoutId = setTimeout(tick, 3000);
    };

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [studio.audio_job_id, studio.audio_status, audioJob?.job_id, audioJob?.status, getAudioJob]);

  const handleAnalyzeArticle = async ({ articleUrl, articleText }) => {
    if (analysisPending) {
      return;
    }

    setAnalysisPending(true);
    setAnalysisError('');

    try {
      await analyzeArticle({ articleUrl, articleText });
    } catch (error) {
      setAnalysisError(error?.message || 'Failed to start analysis pipeline.');
    } finally {
      setAnalysisPending(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (audioPending || !hasLiveIntelligence) {
      return;
    }

    setAudioPending(true);
    setAudioError('');

    try {
      const defaultScript = [
        ...(state.intelligence?.briefing || []),
        '',
        state.intelligence?.hindi_summary || '',
        '',
        state.intelligence?.telugu_summary || '',
      ]
        .join('\n')
        .trim();

      const payload = await generateAudio({
        scriptText: defaultScript,
      });

      if (payload?.job) {
        setAudioJob(payload.job);
      }
    } catch (error) {
      setAudioPending(false);
      setAudioError(error?.message || 'Failed to start audio generation.');
    }
  };

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
        <TelemetryPanel
          state={state}
          onAnalyzeArticle={handleAnalyzeArticle}
          analysisPending={analysisPending}
          analysisError={analysisError}
          onGenerateAudio={handleGenerateAudio}
          canGenerateAudio={hasLiveIntelligence}
          audioPending={audioPending}
          audioError={audioError}
          audioStatus={liveAudioStatus}
          audioMessage={liveAudioMessage}
          audioUrl={liveAudioUrl}
        />
        <Pipeline state={state} />
        <IntelligencePanel state={state} />
      </div>

      <AuditPanel state={state} />
    </div>
  );
}

export default App;
